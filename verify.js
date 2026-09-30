/* Verify the generated dist/ folder is correct and search-optimised. */
'use strict';
const fs = require('fs');
const path = require('path');

const DIST = 'dist';
const read = f => fs.readFileSync(path.join(DIST, f), 'utf8');
let failures = 0;

function ok(label, condition, detail) {
    console.log((condition ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  -> ' + detail : ''));
    if (!condition) failures++;
}

const html = read('index.html');
const SITE = 'https://pluggedbyshayowearyourvibe.edgeone.dev';

console.log('=== The Order button ===');
const orderLinks = [...html.matchAll(/<a href="(https:\/\/wa\.me\/254112958414\?text=[^"]*)"[^>]*class="order-btn"/g)];
ok('every product has an order link', orderLinks.length === 206, orderLinks.length);
ok('no <button> order controls', (html.match(/<button[^>]*class="order-btn"/g) || []).length === 0);
ok('no share-sheet code', (html.match(/navigator\.(canShare|share)/g) || []).length === 0);
const dec = orderLinks.map(m => decodeURIComponent(m[1].split('?text=')[1]));
ok('messages carry name + price + photo',
    dec.every(d => /Product: \S/.test(d) && /Price: Ksh\./.test(d) && /Photo: https:\/\//.test(d)));
ok('links fit inside WhatsApp limits',
    orderLinks.every(m => m[1].length < 2000),
    'longest ' + Math.max(...orderLinks.map(m => m[1].length)));

console.log('');
console.log('=== Google indexing ===');
const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
ok('canonical is your own domain, not Instagram', canon === SITE + '/', canon);
ok('no instagram URL in head', !/l\.instagram\.com\?u=/.test(html));
ok('products present in raw HTML', (html.match(/<article class="product-card">/g) || []).length === 206);
ok('no "Loading products" placeholder', !/>\s*Loading products/.test(html));
ok('og:url matches the domain', html.includes('<meta property="og:url" content="' + SITE + '/">'));

const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
ok('3 structured-data blocks', blocks.length === 3, blocks.length);
const parsed = blocks.map(b => JSON.parse(b[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')));
const types = parsed.map(o => o['@type']).join(', ');
ok('has ClothingStore, FAQPage and ItemList',
    /ClothingStore/.test(types) && /FAQPage/.test(types) && /ItemList/.test(types), types);
const list = parsed.find(o => o['@type'] === 'ItemList');
ok('ItemList covers all 206 products', list.numberOfItems === 206);
ok('every product has a KES price',
    list.itemListElement.every(x => x.item.offers && x.item.offers.priceCurrency === 'KES' && x.item.offers.price > 0));
ok('structured-data URLs use the live domain',
    list.itemListElement.every(x => x.item.url.startsWith(SITE)));

console.log('');
console.log('=== Social sharing ===');
ok('og:title', /<meta property="og:title"/.test(html));
ok('og:description', /<meta property="og:description"/.test(html));
ok('og:image is a real photo',
    /<meta property="og:image" content="https:\/\/.+\.(jpe?g|png|webp)"/i.test(html));
ok('og:locale set for Kenya', /og:locale" content="en_KE"/.test(html));
ok('twitter card', /name="twitter:card"/.test(html));

console.log('');
console.log('=== Favicon ===');
ok('favicon.ico is the PRIMARY icon (listed first)', (() => {
    const icons = [...html.matchAll(/<link rel="icon"[^>]*>/g)].map(m => m[0]);
    return icons.length > 0 && /favicon\.ico/.test(icons[0]);
})(), (html.match(/<link rel="icon"[^>]*>/) || ['none'])[0]);
ok('no data-URI icon overriding it', !/rel="icon" href="data:image/.test(html));
ok('favicon.svg kept as a fallback', /rel="icon" href="\/favicon.svg"/.test(html));
ok('favicon.ico exists in dist', fs.existsSync(path.join(DIST, 'favicon.ico')));
ok('favicon.svg exists in dist', fs.existsSync(path.join(DIST, 'favicon.svg')));
ok('web manifest linked', /rel="manifest"/.test(html));
ok('favicon.svg exists in dist', fs.existsSync(path.join(DIST, 'favicon.svg')));
ok('favicon.ico exists in dist', fs.existsSync(path.join(DIST, 'favicon.ico')));

console.log('');
console.log('=== Crawler files ===');
const robots = read('robots.txt');
ok('robots.txt allows crawling', /User-agent: \*/.test(robots) && /Allow: \//.test(robots));
ok('robots.txt blocks the owner panel', /Disallow: \/admin\.html/.test(robots));
ok('robots.txt points at the sitemap', robots.includes('Sitemap: ' + SITE + '/sitemap.xml'));
const sm = read('sitemap.xml');
ok('sitemap.xml is well-formed', /^<\?xml/.test(sm) && sm.trim().endsWith('</urlset>'));
ok('sitemap.xml lists your homepage', sm.includes('<loc>' + SITE + '/</loc>'));
ok('sitemap has a lastmod date', /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sm));

console.log('');
console.log('=== Structure & accessibility ===');
ok('one <html>', (html.match(/<html/g) || []).length === 1);
ok('one <body>', (html.match(/<body/g) || []).length === 1);
ok('one <h1>', (html.match(/<h1/g) || []).length === 1);
ok('html lang is set', /<html lang="en"/.test(html));
ok('viewport meta present', /name="viewport"/.test(html));
ok('all images have alt text', [...html.matchAll(/<img [^>]*>/g)].every(t => /alt="[^"]+"/.test(t[0])));
ok('images have width/height (prevents layout shift)',
    [...html.matchAll(/<img [^>]*>/g)].every(t => /width=/.test(t[0]) && /height=/.test(t[0])));
ok('lazy loading used', (html.match(/loading="lazy"/g) || []).length > 150);
ok('background image preloaded', /rel="preload"[\s\S]{0,90}background-image\.webp/.test(html));
ok('nav links are real URLs', (html.match(/href="\?cat=/g) || []).length >= 17);
ok('admin page is noindex', /name="robots" content="noindex/.test(read('admin.html')));

console.log('');
console.log('=== dist/ contents ===');
fs.readdirSync(DIST).sort().forEach(f => console.log('    ' + f));
['index.html', 'styles.css', 'app.js', 'categories.js', 'admin.html', 'admin.js',
 'admin.css', '404.html', 'favicon.ico', 'favicon.svg', 'site.webmanifest',
 'background-image.webp', 'background-image.jpg', 'robots.txt', 'sitemap.xml'].forEach(f => {
    ok('  ' + f, fs.existsSync(path.join(DIST, f)));
});
ok('index.template.html is NOT shipped (source only)',
    !fs.existsSync(path.join(DIST, 'index.template.html')));
ok('build.js is NOT shipped', !fs.existsSync(path.join(DIST, 'build.js')));
ok('no 1.2 MB png shipped', !fs.existsSync(path.join(DIST, 'background image.png')));

console.log('');
console.log(failures === 0 ? '>>> ALL CHECKS PASSED' : '>>> ' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
