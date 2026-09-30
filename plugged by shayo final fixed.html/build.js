/* =========================================================
   build.js - generate the deployable site into dist/
   ---------------------------------------------------------
   WHY THIS EXISTS
   The original site sent Google an empty shell containing only
   "Loading products...". The real products were added afterwards by
   JavaScript once Supabase replied, and Google often does not run that
   JavaScript - so Google saw a page with no products, no brands and no
   prices, and there was nothing to rank for.

   This script fetches your catalogue and writes the real product HTML,
   plus Product structured data, straight into dist/index.html. Crawlers,
   WhatsApp and Facebook now see the actual shop.

   SOURCE vs OUTPUT
   index.template.html   is the file you edit by hand.
   dist/                 is generated. Never edit it - it gets overwritten.

   HOW TO RUN
       cd "plugged by shayo htmsl"
       node build.js

   Then upload everything inside dist/ to EdgeOne Pages.

   SAFE TO RE-RUN. It replaces the product block instead of appending, so
   running it twice gives the same result. If Supabase cannot be reached it
   exits without writing anything, so a failed build can never publish a
   broken page.
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const app = require('./app.js');
const Cat = require('./categories.js');

/* ---------- settings ---------- */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rgxnqvxmtdwvfydetkzh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_saQp6oatVhm5UsS-HkOCVw_6nsrCWDo';
const SITE_URL = (process.env.SITE_URL || 'https://pluggedbyshayowearyourvibe.edgeone.dev').replace(/\/+$/, '');

const TEMPLATE = path.join(__dirname, 'index.template.html');
const DIST = path.join(__dirname, 'dist');

const START = '<!-- PRE-RENDER:START -->';
const END = '<!-- PRE-RENDER:END -->';
const JSONLD_START = '<!-- PRODUCT-LIST-JSONLD:START -->';
const JSONLD_END = '<!-- PRODUCT-LIST-JSONLD:END -->';

/* Everything that must ship with the site */
const ASSETS = [
    'styles.css',
    'app.js',
    'categories.js',
    'admin.html',
    'admin.css',
    'admin.js',
    '404.html',
    'favicon.ico',
    'favicon.svg',
    'site.webmanifest',
    'background-image.webp',
    'background-image.jpg'
];

/* ---------- helpers ---------- */

/** Replace whatever sits between two markers, keeping the markers. */
function replaceBetween(html, startMarker, endMarker, content) {
    const a = html.indexOf(startMarker);
    const b = html.indexOf(endMarker);
    if (a === -1 || b === -1 || b < a) return { found: false, html: html };
    return {
        found: true,
        html: html.slice(0, a + startMarker.length) + '\n' + content + '\n' + html.slice(b)
    };
}

/* ---------- fetch the catalogue ---------- */
async function fetchProducts() {
    const url = SUPABASE_URL +
        '/rest/v1/products?select=id,name,price,category,description,image_url,created_at' +
        '&active=eq.true&order=created_at.desc&limit=2000';

    const res = await fetch(url, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            /* Ask Postgres for the true total so we can detect a truncated
               response. Silently pre-rendering only part of the catalogue
               would be worse than not pre-rendering at all. */
            Prefer: 'count=exact'
        }
    });

    if (!res.ok) {
        throw new Error('Supabase returned HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
    }

    const rows = await res.json();
    const range = res.headers.get('content-range');

    if (range && range.indexOf('/') !== -1) {
        const total = Number(range.split('/')[1]);
        if (isFinite(total) && total > rows.length) {
            throw new Error(
                'Supabase returned ' + rows.length + ' of ' + total + ' products. ' +
                'Some products would be missing from the pre-rendered page.'
            );
        }
    }

    return rows;
}

/* ---------- structured data ---------- */
function productListJsonLd(products) {
    const items = products.map((p, i) => {
        const category = Cat.classify(p);
        const node = {
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                name: app.cleanName(p.name).replace(/[<>&]/g, ' ').trim(),
                category: Cat.titleFor(category),
                url: SITE_URL + '/'
            }
        };

        const price = Number(p.price);
        if (isFinite(price) && price > 0) {
            node.item.offers = {
                '@type': 'Offer',
                price: price,
                priceCurrency: 'KES',
                availability: 'https://schema.org/InStock',
                url: SITE_URL + '/',
                seller: { '@type': 'Organization', name: 'Plugged by Shayo' }
            };
        }

        const img = app.safeUrl(p.image_url);
        if (img) node.item.image = img;

        return node;
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Products at Plugged by Shayo',
        numberOfItems: items.length,
        itemListElement: items
    };
}

function jsonLdScript(obj) {
    const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    return '<script type="application/ld+json">\n' + json + '\n</script>';
}

/* ---------- sitemap + robots, generated from SITE_URL ---------- */
function writeSitemap() {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!-- Generated by build.js from SITE_URL. Do not edit by hand. -->\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n' +
        '  <url>\n' +
        '    <loc>' + SITE_URL + '/</loc>\n' +
        '    <lastmod>' + new Date().toISOString().slice(0, 10) + '</lastmod>\n' +
        '    <changefreq>daily</changefreq>\n' +
        '    <priority>1.0</priority>\n' +
        '  </url>\n\n' +
        '</urlset>\n';
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml, 'utf8');
}

function writeRobots() {
    const txt = [
        '# Plugged by Shayo',
        '# ' + SITE_URL + '/',
        '',
        'User-agent: *',
        'Allow: /',
        '',
        '# The owner panel must never appear in search results',
        'Disallow: /admin.html',
        'Disallow: /admin.js',
        '',
        '# Category filters are the same page with a query string. Blocking them',
        '# avoids duplicate-content warnings; the links are still followed, so',
        '# Google still discovers every category.',
        'Disallow: /*?cat=',
        '',
        'Sitemap: ' + SITE_URL + '/sitemap.xml',
        ''
    ].join('\n');
    fs.writeFileSync(path.join(DIST, 'robots.txt'), txt, 'utf8');
}

/* ---------- main ---------- */
async function main() {
    if (!fs.existsSync(TEMPLATE)) {
        console.error('ERROR: index.template.html not found. Run this from the project folder.');
        process.exit(1);
    }

    let html = fs.readFileSync(TEMPLATE, 'utf8');

    if (html.indexOf(START) === -1 || html.indexOf(END) === -1) {
        console.error('ERROR: the PRE-RENDER markers are missing from index.template.html.');
        console.error('  expected: ' + START + ' and ' + END);
        process.exit(1);
    }

    console.log('Site URL: ' + SITE_URL);
    console.log('Fetching products from Supabase...');
    const products = await fetchProducts();
    console.log('  got ' + products.length + ' active product(s)');

    const groups = app.groupProducts(products);
    console.log('  categories with stock:');
    groups.forEach(g => console.log('    ' + String(g.products.length).padStart(4) + '  ' + g.title));

    /* 1. Real product markup, eager-loading the first few images */
    const catalogue = app.renderProducts(products, { eagerCount: 3 });
    const catalogueResult = replaceBetween(html, START, END, catalogue);
    if (!catalogueResult.found) {
        console.error('ERROR: could not inject the catalogue.');
        process.exit(1);
    }
    html = catalogueResult.html;

    /* 2. Product structured data */
    const jsonldResult = replaceBetween(html, JSONLD_START, JSONLD_END,
        jsonLdScript(productListJsonLd(products)));
    if (!jsonldResult.found) {
        console.warn('  warning: PRODUCT-LIST-JSONLD markers missing, structured data skipped');
    }
    html = jsonldResult.html;

    /* 3. Social preview image: a real product photo beats a placeholder.
          Only the og:image / twitter:image tags are touched. */
    const firstImage = products.map(p => app.safeUrl(p.image_url)).find(Boolean);
    if (firstImage) {
        html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, '$1' + firstImage + '$2');
        html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, '$1' + firstImage + '$2');
    }

    /* 4. Canonical + og:url must match the domain the site actually runs on */
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, '$1' + SITE_URL + '/$2');
    html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, '$1' + SITE_URL + '/$2');
    html = html.replace(/("url":\s*")[^"]*(")/, '$1' + SITE_URL + '/$2');
    html = html.replace(/("image":\s*")[^"]*og-image\.jpg(")/g, '$1' + SITE_URL + '/og-image.jpg$2');

    /* ---------- write dist/ ---------- */
    fs.rmSync(DIST, { recursive: true, force: true });
    fs.mkdirSync(DIST, { recursive: true });

    fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

    let copied = 0;
    const missing = [];
    ASSETS.forEach(name => {
        const from = path.join(__dirname, name);
        if (fs.existsSync(from)) {
            fs.copyFileSync(from, path.join(DIST, name));
            copied++;
        } else {
            missing.push(name);
        }
    });

    /* Copy the social preview image if you have made a JPG version */
    ['og-image.jpg', 'og-image.svg'].forEach(name => {
        const from = path.join(__dirname, name);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DIST, name));
    });

    writeSitemap();
    writeRobots();

    const size = (fs.statSync(path.join(DIST, 'index.html')).size / 1024).toFixed(1);
    console.log('');
    console.log('Wrote dist/index.html (' + size + ' KB) with ' + products.length + ' products pre-rendered');
    console.log('Copied ' + copied + ' asset file(s) into dist/');
    console.log('Generated dist/robots.txt and dist/sitemap.xml for ' + SITE_URL);
    if (missing.length) {
        console.log('');
        console.log('WARNING - these expected files are missing from the project:');
        missing.forEach(m => console.log('  ' + m));
    }
    console.log('');
    console.log('Done. Upload everything inside dist/ to your host.');
}

main().catch(err => {
    console.error('');
    console.error('BUILD FAILED: ' + err.message);
    console.error('Nothing was written - your existing site is untouched.');
    process.exit(1);
});
