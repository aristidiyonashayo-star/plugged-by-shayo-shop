/* =========================================================
   Plugged by Shayo - owner panel
   ---------------------------------------------------------
   Changes from the version that is currently live:
     - Category is now a dropdown built from categories.js, so a
       product can never be saved under a spelling the website
       does not recognise (this is why Air Max and Airforce were
       permanently empty).
     - Photos are resized and compressed before upload. The live
       panel uploaded the raw phone photo, so a single product
       image could be several megabytes.
     - A Hide / Show button, so a sold-out shoe can be taken off
       the website without deleting it.
     - A working "Forgot password" flow.
   ========================================================= */
(function () {
    'use strict';

    /* If you log in with the panel iframed somewhere, refuse. */
    if (window.top !== window.self) document.documentElement.innerHTML = '';

    var SUPABASE_URL = 'https://rgxnqvxmtdwvfydetkzh.supabase.co';
    var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_saQp6oatVhm5UsS-HkOCVw_6nsrCWDo';

    /* Where the password-reset email should send the owner back to.
       This must ALSO be listed in Supabase under
       Authentication > URL Configuration > Redirect URLs, or the emailed
       link will not work. Change it if the site moves to a real domain. */
    var ADMIN_URL = 'https://pluggedbyshayowearyourvibe.edgeone.dev/admin.html';

    var currentUser = null;
    var currentImageUrl = '';
    var db = null;
    var Cat = null;

    function $(id) { return document.getElementById(id); }

    /**
     * Report a problem on the page instead of failing silently.
     * Previously, if anything went wrong while starting up, the panel just
     * sat there and clicking Login did nothing at all.
     */
    function fatal(message, detail) {
        var box = $('fatal');
        var text = $('fatalMsg');
        if (!box || !text) return;

        box.classList.remove('hidden');
        text.textContent = message + (detail ? ' (' + detail + ')' : '');
        if (detail) console.error(message, detail);
    }

    function msg(el, text, ok) {
        if (!el) return;
        el.textContent = text;
        el.className = ok ? 'success' : 'error';
    }

    function esc(v) {
        return String(v === null || v === undefined ? '' : v).replace(
            /[&<>'"]/g,
            function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
            }
        );
    }

    function money(v) {
        var n = Number(v);
        return 'Ksh. ' + (isFinite(n) ? n.toLocaleString('en-KE') : '-') + '/=';
    }

    /** Only allow https URLs into src attributes */
    function safeUrl(u) {
        try {
            var x = new URL(u);
            return x.protocol === 'https:' ? x.href : '';
        } catch (e) { return ''; }
    }

    /* ---------- CATEGORY DROPDOWN ---------- */
    function fillCategoryDropdown() {
        var select = $('category');
        if (!select || !Cat) return;

        select.innerHTML = Cat.CATEGORIES.map(function (c) {
            return '<option value="' + esc(c.key) + '">' + esc(c.title) + '</option>';
        }).join('');
    }

    /* ---------- VIEWS ---------- */
    function showLogin() {
        $('loginCard').classList.remove('hidden');
        $('resetCard').classList.add('hidden');
        $('newPasswordCard').classList.add('hidden');
        $('panel').classList.add('hidden');
    }

    function showResetForm() {
        $('loginCard').classList.add('hidden');
        $('resetCard').classList.remove('hidden');
        $('newPasswordCard').classList.add('hidden');
        $('panel').classList.add('hidden');
    }

    function showNewPasswordForm() {
        $('loginCard').classList.add('hidden');
        $('resetCard').classList.add('hidden');
        $('newPasswordCard').classList.remove('hidden');
        $('panel').classList.add('hidden');
    }

    function showPanel() {
        $('loginCard').classList.add('hidden');
        $('resetCard').classList.add('hidden');
        $('newPasswordCard').classList.add('hidden');
        $('panel').classList.remove('hidden');
        loadProducts();
    }

    /* ---------- SESSION ---------- */
    async function checkSession() {
        /* Supabase sends the owner back after they click the emailed reset
           link, in one of two formats depending on how the project is set up:

             ?code=...   PKCE flow (the default for new projects)
             #...type=recovery   the older implicit flow

           Both must be handled, or the "set a new password" form never
           appears and the owner just sees the login box again. */
        var query = new URLSearchParams(window.location.search);

        if (query.get('code')) {
            try {
                var exchanged = await db.auth.exchangeCodeForSession(query.get('code'));
                if (exchanged.error) {
                    showLogin();
                    msg($('loginMsg'), 'That reset link has expired or was already used. Please request a new one.');
                    return;
                }
                window.history.replaceState(null, '', window.location.pathname);
                showNewPasswordForm();
                return;
            } catch (e) {
                showLogin();
                msg($('loginMsg'), 'That reset link could not be used. Please request a new one.');
                return;
            }
        }

        if (window.location.hash.indexOf('type=recovery') !== -1) {
            showNewPasswordForm();
            return;
        }

        var result = await db.auth.getSession();
        var session = result.data && result.data.session;
        if (session) {
            currentUser = session.user;
            showPanel();
        } else {
            showLogin();
        }
    }

    /* ---------- IMAGE HANDLING ---------- */
    /**
     * Resize to a sensible web size and re-encode as JPEG.
     * A 4 MB phone photo usually comes out around 150-300 KB.
     */
    function compressImage(file, maxDimension) {
        maxDimension = maxDimension || 1400;

        return new Promise(function (resolve, reject) {
            if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
                reject(new Error('Please choose a JPG, PNG or WebP photo.'));
                return;
            }

            var objectUrl = URL.createObjectURL(file);
            var img = new Image();

            img.onload = function () {
                URL.revokeObjectURL(objectUrl);

                var scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                var ctx = canvas.getContext('2d');
                /* White background so transparent PNGs do not go black */
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(function (blob) {
                    if (blob) resolve(blob);
                    else reject(new Error('Could not process that image.'));
                }, 'image/jpeg', 0.85);
            };

            img.onerror = function () {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Could not read that image file.'));
            };

            img.src = objectUrl;
        });
    }

    async function uploadImage(file) {
        var blob = await compressImage(file);
        var path = currentUser.id + '/' + crypto.randomUUID() + '.jpg';

        var upload = await db.storage
            .from('product-images')
            .upload(path, blob, {
                cacheControl: '31536000',   /* a year: these images never change */
                upsert: false,
                contentType: 'image/jpeg'
            });

        if (upload.error) throw upload.error;

        var publicUrl = db.storage.from('product-images').getPublicUrl(path);
        return publicUrl.data.publicUrl;
    }

    /* ---------- PRODUCTS LIST ---------- */
    async function loadProducts() {
        var result = await db.from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (result.error) {
            $('productsList').innerHTML = '<p class="error">' + esc(result.error.message) + '</p>';
            return;
        }

        var data = result.data || [];
        if (!data.length) {
            $('productsList').innerHTML = '<p class="muted">No products yet.</p>';
            return;
        }

        $('productsList').innerHTML = data.map(function (p) {
            var img = safeUrl(p.image_url);
            var badge = p.active
                ? '<span class="badge live">Live</span>'
                : '<span class="badge hidden">Hidden</span>';

            return '' +
                '<div class="product">' +
                    (img ? '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<img alt="" src="">') +
                    '<div>' +
                        '<strong>' + esc(p.name) + '</strong>' + badge + '<br>' +
                        money(p.price) + '<br>' +
                        '<span class="muted">' + esc(Cat ? Cat.titleFor(Cat.classify(p)) : p.category) + '</span>' +
                    '</div>' +
                    '<div class="product-actions">' +
                        '<button data-edit="' + esc(p.id) + '">Edit</button>' +
                        '<button class="secondary" data-toggle="' + esc(p.id) + '"' +
                            ' data-active="' + (p.active ? '1' : '0') + '">' +
                            (p.active ? 'Hide' : 'Show') +
                        '</button>' +
                        '<button class="danger" data-del="' + esc(p.id) + '">Delete</button>' +
                    '</div>' +
                '</div>';
        }).join('');
    }

    /* ---------- FORM ---------- */
    function clearForm() {
        $('productForm').reset();
        $('productId').value = '';
        currentImageUrl = '';
        $('preview').style.display = 'none';
        $('formMsg').textContent = '';
        $('formMsg').className = '';
    }

    async function editProduct(id) {
        var result = await db.from('products').select('*').eq('id', id).single();
        if (result.error) { alert(result.error.message); return; }

        var data = result.data;
        $('productId').value = data.id;
        $('name').value = data.name || '';
        $('price').value = data.price;
        $('description').value = data.description || '';
        $('image').value = '';
        currentImageUrl = data.image_url || '';

        /* Preselect the stored category; if it is not in the list
           (an old typo), fall back to the closest match. */
        var select = $('category');
        var match = Cat ? Cat.classify(data) : data.category;
        select.value = match;
        if (!select.value) select.value = Cat ? Cat.OTHER_KEY : '';

        if (currentImageUrl) {
            $('preview').src = currentImageUrl;
            $('preview').style.display = 'block';
        } else {
            $('preview').style.display = 'none';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function deleteProduct(id) {
        if (!confirm('Delete this product permanently?')) return;
        var result = await db.from('products').delete().eq('id', id);
        if (result.error) { alert(result.error.message); return; }
        loadProducts();
    }

    async function toggleProduct(id, isActive) {
        var result = await db.from('products').update({ active: !isActive }).eq('id', id);
        if (result.error) { alert(result.error.message); return; }
        loadProducts();
    }

    /* ---------- WIRE UP EVENTS ---------- */
    function init() {
        /* The Supabase library is loaded from a CDN. If that request is
           blocked - offline, a content blocker, a school or office network -
           then window.supabase is undefined and NOTHING works, including the
           Login button. That is the hardest symptom to diagnose, so say it
           plainly instead of failing silently. */
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            fatal('Could not load the Supabase library. Check your internet connection ' +
                  'or any content blocker, then reload this page.');
            return;
        }

        try {
            db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        } catch (e) {
            fatal('Could not connect to Supabase.', e && e.message);
            return;
        }

        Cat = window.PBS || null;
        if (!Cat) {
            fatal('categories.js did not load, so the category list is unavailable. ' +
                  'Make sure categories.js sits next to admin.html.');
        }

        fillCategoryDropdown();

        $('forgotLink').addEventListener('click', function (e) {
            e.preventDefault();
            showResetForm();
        });

        $('backToLogin').addEventListener('click', showLogin);

        $('resetRequestForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            msg($('resetMsg'), 'Sending...');

            await db.auth.resetPasswordForEmail($('resetEmail').value.trim(), {
                redirectTo: ADMIN_URL
            });

            /* Same message whether or not the address has an account,
               so this cannot be used to discover who has an account. */
            msg($('resetMsg'), 'If that email has an owner account, a reset link is on its way.', true);
        });

        $('newPasswordForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            msg($('newPasswordMsg'), 'Saving...');

            var result = await db.auth.updateUser({ password: $('newPassword').value });
            if (result.error) { msg($('newPasswordMsg'), result.error.message); return; }

            msg($('newPasswordMsg'), 'Password updated. Redirecting to login...', true);
            history.replaceState(null, '', window.location.pathname);
            setTimeout(async function () {
                await db.auth.signOut();
                showLogin();
            }, 1500);
        });

        $('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            msg($('loginMsg'), 'Logging in...');

            var result = await db.auth.signInWithPassword({
                email: $('email').value.trim(),
                password: $('password').value
            });

            if (result.error) { msg($('loginMsg'), result.error.message); return; }

            currentUser = result.data.user;
            msg($('loginMsg'), 'Logged in', true);
            showPanel();
        });

        $('logoutBtn').addEventListener('click', async function () {
            await db.auth.signOut();
            showLogin();
        });

        $('cancelEdit').addEventListener('click', clearForm);

        $('image').addEventListener('change', function () {
            var file = $('image').files[0];
            if (!file) return;
            $('preview').src = URL.createObjectURL(file);
            $('preview').style.display = 'block';
        });

        $('productForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            var button = e.submitter;
            if (button) button.disabled = true;
            msg($('formMsg'), 'Saving...');

            try {
                var id = $('productId').value;
                var imageUrl = currentImageUrl;
                var file = $('image').files[0];

                if (file) imageUrl = await uploadImage(file);

                var payload = {
                    name: $('name').value.trim(),
                    price: Number($('price').value),
                    category: $('category').value,
                    description: $('description').value.trim(),
                    image_url: imageUrl
                };

                var result;
                if (id) {
                    result = await db.from('products').update(payload).eq('id', id);
                } else {
                    payload.active = true;
                    result = await db.from('products').insert(payload);
                }

                if (result.error) throw result.error;

                msg($('formMsg'), 'Product published successfully.', true);
                clearForm();
                loadProducts();

            } catch (err) {
                console.error(err);
                msg($('formMsg'), err.message || 'Could not save the product.');
            } finally {
                if (button) button.disabled = false;
            }
        });

        $('productsList').addEventListener('click', function (e) {
            var button = e.target.closest('button');
            if (!button) return;

            if (button.dataset.edit) return editProduct(button.dataset.edit);
            if (button.dataset.del) return deleteProduct(button.dataset.del);
            if (button.dataset.toggle) {
                return toggleProduct(button.dataset.toggle, button.dataset.active === '1');
            }
        });

        db.auth.onAuthStateChange(function (event, session) {
            if (event === 'PASSWORD_RECOVERY') {
                showNewPasswordForm();
                return;
            }
            if (session) {
                currentUser = session.user;
                showPanel();
            } else {
                currentUser = null;
                showLogin();
            }
        });

        checkSession();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
