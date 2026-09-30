/* Verify the two ZIP archives are valid and sensibly structured. */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..');
let failures = 0;
function ok(label, cond, detail) {
    console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  -> ' + detail : ''));
    if (!cond) failures++;
}

/* Read the ZIP central directory (end-of-central-directory record). */
function listZip(file) {
    const buf = fs.readFileSync(file);
    // find EOCD
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) throw new Error('no end-of-central-directory record');

    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const names = [];

    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory at ' + p);
        const compSize = buf.readUInt32LE(p + 20);
        const rawSize = buf.readUInt32LE(p + 24);
        const nameLen = buf.readUInt16LE(p + 28);
        const extraLen = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
        names.push({ name, compSize, rawSize });
        p += 46 + nameLen + extraLen + commentLen;
    }
    return { buf, names, count };
}

for (const file of ['plugged-by-shayo-GITHUB.zip', 'plugged-by-shayo-UPLOAD-TO-HOST.zip']) {
    const full = path.join(OUT, file);
    console.log('=== ' + file + ' ===');
    ok('file exists', fs.existsSync(full));
    if (!fs.existsSync(full)) { console.log(''); continue; }

    let info;
    try {
        info = listZip(full);
        ok('central directory parses', true, info.count + ' entries');
    } catch (e) {
        ok('central directory parses', false, e.message);
        console.log('');
        continue;
    }

    const names = info.names.map(n => n.name);
    ok('no entry has a zero-byte size', info.names.every(n => n.rawSize >= 0));
    ok('no absolute or .. paths', names.every(n => !n.startsWith('/') && !n.includes('..')));

    if (file.includes('GITHUB')) {
        ok('has index.template.html (the source page)', names.includes('index.template.html'));
        ok('has build.js', names.includes('build.js'));
        ok('has the workflow', names.includes('.github/workflows/deploy.yml'));
        ok('has README.md', names.includes('README.md'));
        ok('does NOT contain dist/ (generated)', !names.some(n => n.startsWith('dist/')));
        ok('does NOT contain node_modules', !names.some(n => n.includes('node_modules')));
    } else {
        ok('index.html is at the ROOT (so host upload works)',
            names.includes('index.html'), names.filter(n => n.endsWith('index.html')).join(', '));
        ok('does NOT nest everything under dist/',
            !names.some(n => n.startsWith('dist/')));
        ok('has the built index.html', names.includes('index.html'));
        ok('has robots.txt', names.includes('robots.txt'));
        ok('has sitemap.xml', names.includes('sitemap.xml'));
        ok('has admin.html', names.includes('admin.html'));
        ok('has app.js + categories.js',
            names.includes('app.js') && names.includes('categories.js'));
        ok('has both background images',
            names.includes('background-image.webp') && names.includes('background-image.jpg'));
        ok('does NOT ship build.js or the template',
            !names.includes('build.js') && !names.includes('index.template.html'));
        ok('does NOT ship the old 1.2 MB png', !names.includes('background image.png'));
    }
    console.log('    ' + names.length + ' entries, ' + (fs.statSync(full).size / 1024).toFixed(0) + ' KB');
    console.log('');
}

/* The built page inside the upload archive should still be the good one */
const distHtml = path.join(__dirname, 'dist', 'index.html');
if (fs.existsSync(distHtml)) {
    const h = fs.readFileSync(distHtml, 'utf8');
    console.log('=== sanity check on dist/index.html ===');
    ok('206 products present', (h.match(/<article class="product-card">/g) || []).length === 206);
    ok('order links are WhatsApp links', (h.match(/class="order-btn"/g) || []).length === 206);
    ok('canonical is your domain, not Instagram',
        /<link rel="canonical" href="https:\/\/pluggedbyshayowearyourvibe\.edgeone\.dev\/">/.test(h));
    ok('favicon.ico is the primary icon',
        (() => {
            const icons = [...h.matchAll(/<link rel="icon"[^>]*>/g)].map(m => m[0]);
            return icons.length > 0 && /favicon\.ico/.test(icons[0]);
        })());
    ok('both button labels are correct',
        (h.match(/Inquire product/g) || []).length === 206 &&
        (h.match(/Order this product/g) || []).length === 206);
    console.log('');
}

console.log(failures === 0 ? '>>> ARCHIVES OK' : '>>> ' + failures + ' PROBLEM(S)');
process.exit(failures === 0 ? 0 : 1);
