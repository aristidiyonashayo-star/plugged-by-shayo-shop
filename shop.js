/* =========================================
   SHOP PHOTOS - add or remove names here.
   Put the files in the "media" folder.
========================================= */
const SHOP_IMAGES = [
    'media/shop-1.jpg',
    'media/shop-2.jpg',
    'media/shop-3.jpg'
];

const SLIDE_SECONDS = 4;

/* ---------- Make sure the videos keep playing (phones can pause them) ---------- */
const vids = document.querySelectorAll('.videos video');
function playVideos() { vids.forEach(v => { v.muted = true; v.play().catch(() => {}); }); }
playVideos();
vids.forEach(v => v.addEventListener('canplay', () => v.play().catch(() => {})));
document.addEventListener('touchstart', playVideos, { once: true, passive: true });

/* ---------- Photo slideshow ---------- */
const box = document.getElementById('slideshow');
const dotsBox = document.getElementById('dots');
let slides = [];
let current = 0;
let timer = null;

function show(i) {
    if (!slides.length) return;
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('on', n === current));
    dotsBox.querySelectorAll('button').forEach((d, n) => d.classList.toggle('on', n === current));
}
function stop() { if (timer) { clearInterval(timer); timer = null; } }
function start() {
    stop();
    if (slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = setInterval(() => show(current + 1), SLIDE_SECONDS * 1000);
    }
}

function build(loaded) {
    loaded.forEach((src, n) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.style.setProperty('--img', 'url("' + src + '")');
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Plugged by Shayo shop';
        img.decoding = 'async';
        slide.appendChild(img);
        box.insertBefore(slide, box.querySelector('.ss-btn'));
        slides.push(slide);

        const d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('aria-label', 'Photo ' + (n + 1));
        d.addEventListener('click', () => { show(n); start(); });
        dotsBox.appendChild(d);
    });
    if (!slides.length) return;
    box.hidden = false;
    if (slides.length < 2) box.querySelectorAll('.ss-btn, .dots').forEach(el => el.style.display = 'none');
    show(0);
    start();
}

/* keep only photos that actually exist, in the listed order */
Promise.all(SHOP_IMAGES.map(src => new Promise(res => {
    const t = new Image();
    t.onload = () => res(src);
    t.onerror = () => res(null);
    t.src = src;
}))).then(list => build(list.filter(Boolean)));

box.querySelector('.prev').addEventListener('click', () => { show(current - 1); start(); });
box.querySelector('.next').addEventListener('click', () => { show(current + 1); start(); });

/* swipe on phones */
let touchX = null;
box.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) { show(current + (dx < 0 ? 1 : -1)); start(); }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { start(); playVideos(); } });
