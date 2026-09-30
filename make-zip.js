/* make-zip.js - build the two ZIP archives with Node (no external tools).
   Usage: node make-zip.js */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- minimal ZIP writer ---------- */
const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

/**
 * @param {Array<{name: string, data: Buffer}>} entries
 * @returns {Buffer}
 */
function buildZip(entries) {
    const chunks = [];
    const central = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
        const crc = crc32(entry.data);
        const deflated = zlib.deflateRawSync(entry.data, { level: 9 });
        const useDeflate = deflated.length < entry.data.length;
        const stored = useDeflate ? deflated : entry.data;
        const method = useDeflate ? 8 : 0;

        /* local file header */
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);            // version needed
        local.writeUInt16LE(0x0800, 6);        // UTF-8 filename flag
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(0, 10);            // time
        local.writeUInt16LE(0x21, 12);         // date (1980-01-01)
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(stored.length, 18);
        local.writeUInt32LE(entry.data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);

        chunks.push(local, nameBuf, stored);
        central.push({ nameBuf, crc, method, comp: stored.length, raw: entry.data.length, offset });
        offset += local.length + nameBuf.length + stored.length;
    }

    const centralStart = offset;
    for (const e of central) {
        const h = Buffer.alloc(46);
        h.writeUInt32LE(0x02014b50, 0);
        h.writeUInt16LE(20, 4);                // version made by
        h.writeUInt16LE(20, 6);                // version needed
        h.writeUInt16LE(0x0800, 8);            // UTF-8 flag
        h.writeUInt16LE(e.method, 10);
        h.writeUInt16LE(0, 12);
        h.writeUInt16LE(0x21, 14);
        h.writeUInt32LE(e.crc, 16);
        h.writeUInt32LE(e.comp, 20);
        h.writeUInt32LE(e.raw, 24);
        h.writeUInt16LE(e.nameBuf.length, 28);
        h.writeUInt16LE(0, 30);                // extra
        h.writeUInt16LE(0, 32);                // comment
        h.writeUInt16LE(0, 34);                // disk
        h.writeUInt16LE(0, 36);                // internal attrs
        h.writeUInt32LE(0, 38);                // external attrs
        h.writeUInt32LE(e.offset, 42);
        chunks.push(h, e.nameBuf);
        offset += h.length + e.nameBuf.length;
    }

    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(offset - centralStart, 12);
    end.writeUInt32LE(centralStart, 16);
    end.writeUInt16LE(0, 20);
    chunks.push(end);

    return Buffer.concat(chunks);
}

/* ---------- collect files ---------- */
const ROOT = __dirname;
const OUT = path.resolve(ROOT, '..');

function collect(relPaths) {
    const entries = [];
    const missing = [];
    for (const rel of relPaths) {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) { missing.push(rel); continue; }
        entries.push({ name: rel, data: fs.readFileSync(abs) });
    }
    return { entries, missing };
}

/* ---------- the two archives ---------- */

/* 1. Everything you push to GitHub (source, no dist/, no node_modules) */
const REPO = [
    '404.html', 'admin.css', 'admin.html', 'admin.js', 'app.js',
    'background-image.jpg', 'background-image.webp',
    'build.js', 'categories.js',
    'favicon.ico', 'favicon.svg',
    'index.template.html', 'login-test.js', 'make-zip.js', 'og-image.svg',
    'package.json', 'README.md', 'site.webmanifest', 'styles.css',
    'verify.js', 'verify-zip.js',
    '.gitignore', '.github/workflows/deploy.yml'
];

/* 2. Everything you upload to your web host.
      The dist/ prefix is stripped, so the archive contains index.html at the
      ROOT. Extracting it straight into your host folder then puts the files
      where the web server expects them. */
const LIVE = fs.existsSync(path.join(ROOT, 'dist'))
    ? fs.readdirSync(path.join(ROOT, 'dist')).map(f => ({
        abs: path.join(ROOT, 'dist', f),
        name: f
    }))
    : [];

function write(name, relPaths) {
    const entries = [];
    const missing = [];

    for (const rel of relPaths) {
        /* either a repo-relative string, or a {abs,name} pair from dist/ */
        const abs = typeof rel === 'string' ? path.join(ROOT, rel) : rel.abs;
        const entryName = typeof rel === 'string' ? rel : rel.name;
        if (!fs.existsSync(abs)) { missing.push(entryName); continue; }
        entries.push({ name: entryName, data: fs.readFileSync(abs) });
    }

    if (!entries.length) {
        console.log('  ' + name + ': NOTHING TO PACKAGE');
        return;
    }
    const buf = buildZip(entries);
    const target = path.join(OUT, name);
    fs.writeFileSync(target, buf);

    console.log('  ' + name);
    console.log('    ' + entries.length + ' files, ' + (buf.length / 1024).toFixed(0) + ' KB');
    entries.sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
        console.log('      ' + e.name.replace(/\\/g, '/').padEnd(34) +
            (e.data.length / 1024).toFixed(1).padStart(8) + ' KB');
    });
    if (missing.length) console.log('    missing: ' + missing.join(', '));
}

console.log('Building ZIP archives...');
console.log('');
write('plugged-by-shayo-GITHUB.zip', REPO);
console.log('');
write('plugged-by-shayo-UPLOAD-TO-HOST.zip', LIVE);
console.log('');
console.log('Done. Both files are in ' + OUT);
