if(window.top!==window.self){document.documentElement.innerHTML=''} // anti-clickjacking
const SUPABASE_URL='https://rgxnqvxmtdwvfydetkzh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_saQp6oatVhm5UsS-HkOCVw_6nsrCWDo';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let currentUser=null;
let currentImageUrl='';

const $=id=>document.getElementById(id);
function msg(el,text,ok=false){el.textContent=text;el.className=ok?'success':'error'}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function money(v){return 'Ksh. '+Number(v).toLocaleString('en-KE')+'/='}

async function checkSession(){
 // Supabase redirects back here with a recovery token after the user
 // clicks the emailed reset link — catch that before the normal login check.
 if(location.hash.includes('type=recovery')){showNewPasswordForm();return}
 const {data:{session}}=await db.auth.getSession();
 if(session){currentUser=session.user; showPanel();} else showLogin();
}
function showLogin(){$('loginCard').classList.remove('hidden');$('resetCard').classList.add('hidden');$('newPasswordCard').classList.add('hidden');$('panel').classList.add('hidden')}
function showPanel(){$('loginCard').classList.add('hidden');$('resetCard').classList.add('hidden');$('newPasswordCard').classList.add('hidden');$('panel').classList.remove('hidden');loadProducts()}
function showResetForm(){$('loginCard').classList.add('hidden');$('resetCard').classList.remove('hidden')}
function showNewPasswordForm(){$('loginCard').classList.add('hidden');$('resetCard').classList.add('hidden');$('panel').classList.add('hidden');$('newPasswordCard').classList.remove('hidden')}

$('forgotLink').addEventListener('click',e=>{e.preventDefault();showResetForm()});
$('backToLogin').addEventListener('click',showLogin);

$('resetRequestForm').addEventListener('submit',async e=>{
 e.preventDefault();msg($('resetMsg'),'Sending...');
 const {error}=await db.auth.resetPasswordForEmail($('resetEmail').value.trim(),{redirectTo:location.origin+location.pathname});
 // Same message whether or not the email exists, so this can't be used to check who has an account
 msg($('resetMsg'),'If that email has an owner account, a reset link is on its way.',true);
});

$('newPasswordForm').addEventListener('submit',async e=>{
 e.preventDefault();msg($('newPasswordMsg'),'Saving...');
 const {error}=await db.auth.updateUser({password:$('newPassword').value});
 if(error){msg($('newPasswordMsg'),error.message);return}
 msg($('newPasswordMsg'),'Password updated. Redirecting to login...',true);
 history.replaceState(null,'',location.pathname);
 setTimeout(async()=>{await db.auth.signOut();showLogin()},1500);
});

$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();msg($('loginMsg'),'Logging in...');
 const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
 if(error){msg($('loginMsg'),error.message);return}
 currentUser=data.user;msg($('loginMsg'),'Logged in',true);showPanel();
});
$('logoutBtn').onclick=async()=>{await db.auth.signOut();showLogin()};
$('cancelEdit').onclick=clearForm;
$('image').addEventListener('change',()=>{const f=$('image').files[0];if(!f)return;$('preview').src=URL.createObjectURL(f);$('preview').style.display='block'});

function compressImage(file,max=1400){return new Promise((res,rej)=>{
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))return rej(new Error('Please choose a JPG, PNG or WebP photo.'));
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(new Error('Could not process image.')),'image/jpeg',0.85)};
 img.onerror=()=>rej(new Error('Could not read that image.'));img.src=url})}
async function uploadImage(file){
 const blob=await compressImage(file);
 const path=currentUser.id+'/'+crypto.randomUUID()+'.jpg';
 const {error}=await db.storage.from('product-images').upload(path,blob,{cacheControl:'31536000',upsert:false,contentType:'image/jpeg'});
 if(error)throw error;
 return db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

$('productForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=e.submitter;if(btn)btn.disabled=true;msg($('formMsg'),'Saving...');
 try{
  const id=$('productId').value;
  let imageUrl=currentImageUrl;
  const file=$('image').files[0];
  if(file) imageUrl=await uploadImage(file);
  const payload={name:$('name').value.trim(),price:Number($('price').value),category:$('category').value.trim(),description:$('description').value.trim(),image_url:imageUrl};
  let result;
  if(id) result=await db.from('products').update(payload).eq('id',id); else result=await db.from('products').insert({...payload,active:true});
  if(result.error)throw result.error;
  msg($('formMsg'),'Product published successfully.',true);clearForm();loadProducts();
 }catch(err){console.error(err);msg($('formMsg'),err.message||'Could not save product.')}finally{if(btn)btn.disabled=false}
});

async function loadProducts(){
 const {data,error}=await db.from('products').select('*').order('created_at',{ascending:false});
 if(error){$('productsList').innerHTML='<p class="error">'+esc(error.message)+'</p>';return}
 if(!data.length){$('productsList').innerHTML='<p class="muted">No products yet.</p>';return}
 $('productsList').innerHTML=data.map(p=>`<div class="product"><img src="${esc(p.image_url||'')}" alt="${esc(p.name)}"><div><strong>${esc(p.name)}</strong><br>${money(p.price)}<br><span class="muted">${esc(p.category)}${p.active?'':' — hidden'}</span></div><div class="product-actions"><button data-edit="${esc(p.id)}">Edit</button> <button class="secondary" data-toggle="${esc(p.id)}" data-active="${p.active?1:0}">${p.active?'Hide':'Show'}</button> <button class="danger" data-del="${esc(p.id)}">Delete</button></div></div>`).join('');
}

window.editProduct=async id=>{const {data,error}=await db.from('products').select('*').eq('id',id).single();if(error){alert(error.message);return}$('productId').value=data.id;$('name').value=data.name;$('price').value=data.price;$('category').value=data.category;$('description').value=data.description||'';currentImageUrl=data.image_url||'';$('image').value='';if(currentImageUrl){$('preview').src=currentImageUrl;$('preview').style.display='block'}window.scrollTo({top:0,behavior:'smooth'});};
window.deleteProduct=async id=>{if(!confirm('Delete this product?'))return;const {error}=await db.from('products').delete().eq('id',id);if(error){alert(error.message);return}loadProducts()};
function clearForm(){$('productForm').reset();$('productId').value='';currentImageUrl='';$('preview').style.display='none';$('formMsg').textContent=''}

db.auth.onAuthStateChange((_e,session)=>{if(session){currentUser=session.user}else{currentUser=null;showLogin()}});
checkSession();
$('productsList').addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.edit)return window.editProduct(b.dataset.edit);
 if(b.dataset.del)return window.deleteProduct(b.dataset.del);
 if(b.dataset.toggle){const {error}=await db.from('products').update({active:b.dataset.active!=='1'}).eq('id',b.dataset.toggle);if(error)alert(error.message);else loadProducts()}
});
