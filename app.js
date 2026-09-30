/* =========================================================
   Plugged by Shayo - shop page script
   ---------------------------------------------------------
   Runs in the browser. The pure parts (buildProductCard,
   renderProducts) are also exported so build.js can use the
   exact same markup to pre-render products for Google.
   ========================================================= */
(function () {
    'use strict';

    /* ---------- CONFIG ---------- */
    var SUPABASE_URL = 'https://rgxnqvxmtdwvfydetkzh.supabase.co';
    var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_saQp6oatVhm5UsS-HkOCVw_6nsrCWDo';
    var SHOP_WHATSAPP = '254112958414';
    var SHOP_NAME = 'Plugged by Shayo';

    var Cat = (typeof window !== 'undefined' && window.PBS) ||
              (typeof require === 'function' ? require('./categories.js') : null);

    /* ---------- HELPERS ---------- */

    /** Format a price the way the shop quotes it: Ksh. 3,900/= */
    function money(value) {
        var n = Number(value);
        if (!isFinite(n)) return 'Ksh. -';
        return 'Ksh. ' + n.toLocaleString('en-KE') + '/=';
    }

    /** Only allow https image URLs (blocks javascript:/data: tricks) */
    function safeUrl(u) {
        try {
            var x = new URL(u);
            return x.protocol === 'https:' ? x.href : '';
        } catch (e) {
            return '';
        }
    }

    function escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value).replace(
            /[&<>'"]/g,
            function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
            }
        );
    }

    /**
     * Product names are often pasted straight from WhatsApp, so they
     * arrive wrapped in *asterisks* with emoji. Strip the markdown and
     * the decorative symbols for display; the raw name is still used in
     * the WhatsApp message so the owner recognises the item.
     */
    function cleanName(raw) {
        var s = String(raw === null || raw === undefined ? '' : raw);
        s = s.replace(/\*/g, ' ');                       // markdown bold
        s = s.replace(/[\u0000-\u001F\u007F]/g, ' ');    // control chars
        s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ');
        s = s.replace(/[®™©]/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();
        s = s.replace(/^[\-–—_:;,.\s]+/, '').replace(/[\-–—_:;,.\s]+$/, '');
        return s || String(raw || '').trim();
    }

    function whatsappLink(text) {
        return 'https://wa.me/' + SHOP_WHATSAPP + '?text=' + encodeURIComponent(text);
    }

    /** Build the WhatsApp link for "I want to ask about this" */
    function inquireUrl(product) {
        return whatsappLink(
            'Hi! I want to inquire about ' + (product.name || 'a product') +
            ' from ' + SHOP_NAME + '. Please tell me about available colors and sizes.'
        );
    }

    /**
     * The message the customer's WhatsApp opens with when they press
     * "Order this product". It carries the name, price, sizes and the
     * photo link so the owner knows exactly which shoe is being ordered.
     */
    function orderMessage(product) {
        var lines = [
            'Hello ' + SHOP_NAME + '! I would like to ORDER this product.',
            '',
            'Product: ' + (product.name || ''),
            'Price: ' + money(product.price)
        ];

        if (product.description) {
            lines.push('Sizes / details: ' + product.description);
        }

        var img = safeUrl(product.image_url);
        if (img) lines.push('Photo: ' + img);

        lines.push('');
        lines.push('My size: ______');
        lines.push('My location: ______');

        return lines.join('\n');
    }

    /** Direct wa.me link that opens WhatsApp with the order pre-filled */
    function orderUrl(product) {
        return whatsappLink(orderMessage(product));
    }

    /* ---------- PRODUCT CARD (pure) ---------- */

    /**
     * @param {object} product - { name, price, description, image_url, category }
     * @param {object} [opts]  - { eager: true } disables lazy loading
     *                           (used for the first few pre-rendered cards)
     * @returns {string} HTML
     */
    function buildProductCard(product, opts) {
        opts = opts || {};
        var displayName = cleanName(product.name);
        var img = safeUrl(product.image_url);
        var inquiry = inquireUrl(product);
        var order = orderUrl(product);

        return '' +
            '<article class="product-card">' +
                '<div class="product-image">' +
                    (img
                        ? '<img src="' + escapeHtml(img) + '"' +
                          ' alt="' + escapeHtml(displayName) + '"' +
                          ' loading="' + (opts.eager ? 'eager' : 'lazy') + '"' +
                          ' decoding="async" width="240" height="250">'
                        : '') +
                '</div>' +
                '<div class="product-info">' +
                    '<h3>' + escapeHtml(displayName) + '</h3>' +
                    (product.description
                        ? '<p>' + escapeHtml(product.description) + '</p>'
                        : '') +
                    '<div class="product-price">' + escapeHtml(money(product.price)) + '</div>' +
                    '<div class="product-actions">' +
                        /* A plain link to WhatsApp. This always works - on
                           desktop, on Android, on iPhone - and it opens the
                           chat with the product name, price, sizes and photo
                           already typed in. */
                        '<a href="' + escapeHtml(order) + '"' +
                        ' target="_blank" rel="noopener noreferrer"' +
                        ' class="order-btn"' +
                        ' aria-label="Order ' + escapeHtml(displayName) + ' on WhatsApp">' +
                            '<i class="fas fa-shopping-cart" aria-hidden="true"></i>' +
                            ' Order this product' +
                        '</a>' +
                        '<a href="' + escapeHtml(inquiry) + '"' +
                        ' target="_blank" rel="noopener noreferrer"' +
                        ' class="whatsapp-btn">' +
                            '<i class="fab fa-whatsapp" aria-hidden="true"></i>' +
                            ' Inquire product' +
                        '</a>' +
                    '</div>' +
                '</div>' +
            '</article>';
    }

    /* ---------- GROUPING + RENDERING (pure) ---------- */

    /**
     * Group products into category buckets, keeping the order the
     * categories are declared in categories.js.
     * @returns {Array<{key,title,products}>} only non-empty buckets
     */
    function groupProducts(products) {
        var buckets = {};
        Cat.CATEGORIES.forEach(function (c) { buckets[c.key] = []; });
        buckets[Cat.OTHER_KEY] = [];

        (products || []).forEach(function (product) {
            var key = Cat.classify(product);
            if (!buckets[key]) {
                buckets[Cat.OTHER_KEY].push(product);
            } else {
                buckets[key].push(product);
            }
        });

        var ordered = [];
        Cat.CATEGORIES.forEach(function (c) {
            if (buckets[c.key].length) {
                ordered.push({ key: c.key, title: c.title, products: buckets[c.key] });
            }
        });
        if (buckets[Cat.OTHER_KEY].length) {
            ordered.push({
                key: Cat.OTHER_KEY,
                title: Cat.OTHER_TITLE,
                products: buckets[Cat.OTHER_KEY]
            });
        }
        return ordered;
    }

    /**
     * Full HTML for every category section.
     * @param {Array} products
     * @param {object} [opts] - { eagerCount: number }
     */
    function renderProducts(products, opts) {
        opts = opts || {};
        var eagerCount = typeof opts.eagerCount === 'number' ? opts.eagerCount : 0;
        var groups = groupProducts(products);

        if (!groups.length) {
            return '<p class="no-products">No products available at the moment. ' +
                   'Please check back soon or message us on WhatsApp.</p>';
        }

        var seen = 0;

        return groups.map(function (group) {
            var id = Cat.sectionId(group.key);

            var cards = group.products.map(function (product) {
                var eager = seen < eagerCount;
                seen++;
                return buildProductCard(product, { eager: eager });
            }).join('');

            return '' +
                '<section class="category" id="' + id + '" data-category="' +
                    escapeHtml(group.key) + '">' +
                    '<h2>' +
                        '<span class="category-icon" aria-hidden="true"></span>' +
                        escapeHtml(group.title) +
                    '</h2>' +
                    '<div class="products-row-wrapper">' +
                        '<div class="products-grid">' + cards + '</div>' +
                        '<button class="category-scroll-btn" type="button"' +
                        ' data-scroll="' + id + '"' +
                        ' aria-label="See more ' + escapeHtml(group.title) + ' products">' +
                            '<i class="fas fa-chevron-right" aria-hidden="true"></i>' +
                        '</button>' +
                    '</div>' +
                '</section>';
        }).join('');
    }

    /* ---------- EXPORT PURE PARTS (for build.js) ---------- */
    var pureApi = {
        money: money,
        safeUrl: safeUrl,
        escapeHtml: escapeHtml,
        cleanName: cleanName,
        inquireUrl: inquireUrl,
        orderMessage: orderMessage,
        orderUrl: orderUrl,
        buildProductCard: buildProductCard,
        groupProducts: groupProducts,
        renderProducts: renderProducts,
        SHOP_WHATSAPP: SHOP_WHATSAPP,
        SHOP_NAME: SHOP_NAME
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = pureApi;
        return; /* nothing DOM-related in Node */
    }

    window.PBSApp = pureApi;

    /* =======================================================
       Everything below needs the browser
       ======================================================= */

    var supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    var PRODUCTS = [];

    function root() {
        return document.getElementById('supabase-products');
    }

    function setYear() {
        var el = document.getElementById('year');
        if (el) el.textContent = String(new Date().getFullYear());
    }

    /* ---------- SCROLL ---------- */
    function scrollCategory(sectionIdToScroll) {
        var section = document.getElementById(sectionIdToScroll);
        if (!section) return;
        var row = section.querySelector('.products-grid');
        if (!row) return;
        row.scrollBy({ left: row.clientWidth * 0.75, behavior: 'smooth' });
    }

    /* ---------- FILTER ---------- */
    function filterProducts(searchTerm) {
        var term = String(searchTerm || '').trim().toLowerCase();
        var sections = document.querySelectorAll('.category');
        var visibleCount = 0;

        sections.forEach(function (section) {
            var cards = section.querySelectorAll('.product-card');
            if (!cards.length) return;

            var matches = 0;
            cards.forEach(function (card) {
                /* Only search the product's own text. The old version also
                   matched the category heading, so searching "nike" hid
                   every other brand and made the nav behave oddly. */
                var haystack = card.textContent.toLowerCase() + ' ' +
                    ((card.querySelector('img') && card.querySelector('img').alt) || '').toLowerCase();

                var hit = !term || haystack.indexOf(term) !== -1;
                card.style.display = hit ? '' : 'none';
                if (hit) { matches++; visibleCount++; }
            });

            section.style.display = matches > 0 ? '' : 'none';
        });

        var clearButton = document.getElementById('search-clear');
        var status = document.getElementById('search-status');

        if (clearButton) clearButton.style.display = term ? 'block' : 'none';

        if (status) {
            status.style.display = term ? 'block' : 'none';
            status.textContent = term
                ? visibleCount + ' product' + (visibleCount === 1 ? '' : 's') + ' found'
                : '';
        }

        document.querySelectorAll('.no-search-results').forEach(function (el) { el.remove(); });

        if (term && visibleCount === 0) {
            var liveSection = document.getElementById('live-products');
            if (liveSection && liveSection.parentNode) {
                var message = document.createElement('div');
                message.className = 'no-search-results';
                message.style.display = 'block';
                message.innerHTML = '<strong>No products found.</strong><br>' +
                    'Try another product name, brand or category.';
                liveSection.parentNode.insertBefore(message, liveSection);
            }
        }
    }

    /* ---------- CATEGORY NAVIGATION (real URLs) ---------- */
    /**
     * Selecting a category now updates the address bar to ?cat=Nike
     * instead of href="#", so a customer can bookmark it, share it,
     * use the back button, and Google can follow the link.
     */
    function searchCategory(category, options) {
        options = options || {};
        var input = document.getElementById('product-search');
        if (!input) return;

        var value = category || '';

        input.value = value;
        filterProducts(value);

        /* Reflect the choice in the URL */
        if (options.updateUrl !== false) {
            var url = new URL(window.location.href);
            if (value) {
                url.searchParams.set('cat', value);
            } else {
                url.searchParams.delete('cat');
            }
            var next = url.pathname + (url.search || '');
            if (options.replace) {
                window.history.replaceState({ cat: value }, '', next);
            } else {
                window.history.pushState({ cat: value }, '', next);
            }
        }

        if (!value) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        /* Scroll to the section for this category, if it exists */
        var section = document.getElementById(Cat.sectionId(value));
        if (!section) {
            var isKnown = Cat.CATEGORIES.some(function (c) {
                return c.key.toLowerCase() === value.toLowerCase();
            });
            if (!isKnown) section = document.getElementById(Cat.sectionId(Cat.OTHER_KEY));
        }
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /* ---------- LOAD FROM SUPABASE ---------- */
    function showError(message) {
        var el = root();
        if (el) el.innerHTML = '<p class="no-products">' + escapeHtml(message) + '</p>';
    }

    async function loadLiveProducts() {
        var result = await supabaseClient
            .from('products')
            .select('id,name,price,category,description,image_url,created_at')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (result.error) {
            console.error('Could not load Supabase products:', result.error);
            showError('Products are temporarily unavailable. Please try again later.');
            return;
        }

        PRODUCTS = result.data || [];

        var el = root();
        if (el) el.innerHTML = renderProducts(PRODUCTS, { eagerCount: 3 });

        var input = document.getElementById('product-search');
        if (input && input.value) filterProducts(input.value);
    }

    /* ---------- EVENTS ---------- */
    function setupSearch() {
        var input = document.getElementById('product-search');
        var clearButton = document.getElementById('search-clear');
        if (!input) return;

        var debounce = null;
        input.addEventListener('input', function () {
            clearTimeout(debounce);
            debounce = setTimeout(function () { filterProducts(input.value); }, 120);
        });

        if (clearButton) {
            clearButton.addEventListener('click', function () {
                input.value = '';
                input.focus();
                filterProducts('');
                searchCategory('', { replace: true });
            });
        }
    }

    function setupNav() {
        document.addEventListener('click', function (e) {
            var navLink = e.target.closest('[data-cat]');
            if (navLink) {
                /* Let the browser handle middle-click / new-tab clicks */
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                searchCategory(navLink.dataset.cat || '');
                return;
            }

            var scrollBtn = e.target.closest('[data-scroll]');
            if (scrollBtn) {
                scrollCategory(scrollBtn.dataset.scroll);
            }
        });

        /* Back / forward buttons */
        window.addEventListener('popstate', function () {
            var value = new URL(window.location.href).searchParams.get('cat') || '';
            searchCategory(value, { updateUrl: false });
        });
    }

    /* ---------- START ---------- */
    function start() {
        setYear();
        setupSearch();
        setupNav();

        /* Apply ?cat=... on first load so shared links work */
        var initial = new URL(window.location.href).searchParams.get('cat') || '';
        if (initial) {
            searchCategory(initial, { updateUrl: false, replace: true });
        }

        loadLiveProducts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
