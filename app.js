const SUPABASE_URL = 'https://rgxnqvxmtdwvfydetkzh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_saQp6oatVhm5UsS-HkOCVw_6nsrCWDo';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const SHOP_WHATSAPP = '254112958414';

// Only allow https image URLs (blocks javascript:/data: tricks)
function safeUrl(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}}

function money(value) {
    return 'Ksh. ' + Number(value).toLocaleString('en-KE') + '/=';
}


/* =========================================
   CATEGORY CONFIGURATION
========================================= */

const CATEGORY_CONFIG = [
    { key: 'Nike', title: 'Nike', icon: '' },
    { key: 'Jordan', title: 'Jordans', icon: '' },
    { key: 'Vans', title: 'Vans', icon: '' },
    { key: 'New Balance', title: 'New Balance', icon: '' },
    { key: 'Airforce', title: 'Airforce', icon: '' },
    { key: 'Airmax', title: 'Air Max', icon: '' },
    { key: 'Samba', title: 'Samba', icon: '' },
    { key: 'Converse', title: 'Converse', icon: '' },
    { key: 'slides', title: 'Sandals', icon: '' },
    { key: 'Puma', title: 'Puma', icon: '' },
    { key: 'Timberland', title: 'Timberland', icon: '' },
    { key: 'ASICS', title: 'ASICS', icon: '' },
    { key: 'Numeris', title: 'Numeris', icon: '' },
    { key: 'Dr martens boots', title: 'Dr martens boots', icon: '' },
    { key: 'Clark', title: 'Clarks', icon: '' },
    { key: 'Adidas', title: 'Adidas', icon: '' },
    { key: 'New era', title: 'New Era Caps', icon: '' }
];


/* =========================================
   DETERMINE PRODUCT CATEGORY
========================================= */

function getProductCategory(productCategory) {

    const category = String(productCategory || '')
        .toLowerCase()
        .trim();

    if (category.includes('nike')) return 'Nike';

    if (category.includes('jordan')) return 'Jordan';

    if (category.includes('vans')) return 'Vans';

    if (
        category.includes('new balance') ||
        category.includes('newbalance')
    ) {
        return 'New Balance';
    }

    if (
        category.includes('airforce') ||
        category.includes('air force')
    ) {
        return 'Airforce';
    }

if (
        category.includes('asics') ||
        category.includes('asics')
    ) {
        return 'ASICS';
    }

    if (
        category.includes('timberland') ||
        category.includes('timberland')
    ) {
        return 'Timberland';
    }

    if (
        category.includes('martens') ||
        category.includes('martens')
    ) {
        return 'Dr martens boots';
    }

    if (
        category.includes('numeris') ||
        category.includes('numeris')
    ) {
        return 'Numeris';
    }


    if (
        category.includes('airmax') ||
        category.includes('air max')
    ) {
        return 'Airmax';
    }

    if (category.includes('samba')) return 'Samba';

    if (category.includes('converse')) return 'Converse';

    if (
        category.includes('slide') ||
        category.includes('sandals') ||
        category.includes('sandal')
    ) {
        return 'slides';
    }

    if (category.includes('puma')) return 'Puma';

    if (
        category.includes('new era') ||
        category.includes('newera')
    ) {
        return 'New era';
    }

    if (category.includes('adidas')) return 'Adidas';

    if (
        category.includes('clark') ||
        category.includes('clarks')
    ) {
        return 'Clark';
    }

    return 'Other Brands';
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {
    return String(value ?? '').replace(
        /[&<>'"]/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[c])
    );
}


/* =========================================
   CREATE PRODUCT CARD
========================================= */

function createProductCard(product) {

    // INQUIRE BUTTON
    const inquireText =
        `Hi! I want to inquire about ${product.name} from Plugged by Shayo. Please tell me about available colors and sizes.`;

    const inquireWa =
        `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(inquireText)}`;


    // ORDER BUTTON (fallback text, used if native image sharing isn't available)
    const orderText =
        `Hello! I would like to order this product from Plugged by Shayo.\n\n` +
        `Product: ${product.name}\n` +
        `Price: ${money(product.price)}\n` +
        `Image: ${safeUrl(product.image_url) || 'No image available'}`;

    const orderWa =
        `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(orderText)}`;

    const orderShareText =
        `Hello! I would like to order this product from Plugged by Shayo.\n\n` +
        `Product: ${product.name}\n` +
        `Price: ${money(product.price)}`;


    return `
        <div class="product-card">

            <div class="product-image">
                ${safeUrl(product.image_url) ? `<img src="${escapeHtml(safeUrl(product.image_url))}" loading="lazy" decoding="async" alt="${escapeHtml(product.name)}">`
                    : ''
                }
            </div>

            <div class="product-info">

                <h3>${escapeHtml(product.name)}</h3>

                <p>${escapeHtml(product.description || '')}</p>

                <div class="product-price">
                    ${money(product.price)}
                </div>

                <div class="product-actions">

                    <a href="${inquireWa}"
                       target="_blank"
                       rel="noopener"
                       class="whatsapp-btn">
                        <i class="fab fa-whatsapp"></i>
                        Inquire about product
                    </a>

                    <button type="button"
                       class="order-btn"
                       data-order-name="${escapeHtml(product.name)}"
                       data-order-text="${escapeHtml(orderShareText)}"
                       data-order-image="${escapeHtml(safeUrl(product.image_url))}"
                       data-order-fallback="${escapeHtml(orderWa)}">
                        <i class="fas fa-shopping-cart"></i>
                        Order this product
                    </button>

                </div>

            </div>

        </div>
    `;
}

/* =========================================
   RENDER PRODUCTS BY CATEGORY
========================================= */

function renderLiveProducts(products) {

    const root =
        document.getElementById('supabase-products');

    if (!root) return;

    if (!products || !products.length) {

        root.innerHTML = `
            <p style="
                text-align:center;
                color:#666;
                padding:30px;
            ">
                No products available at the moment.
            </p>
        `;

        return;
    }


    const grouped = {};


    CATEGORY_CONFIG.forEach(category => {
        grouped[category.key] = [];
    });


    grouped['Other Brands'] = [];


    products.forEach(product => {

        const category =
            getProductCategory(product.category);

        if (grouped[category]) {
            grouped[category].push(product);
        } else {
            grouped['Other Brands'].push(product);
        }

    });


    let html = '';


    /* NORMAL CATEGORIES */

    CATEGORY_CONFIG.forEach(category => {

        const categoryProducts =
            grouped[category.key];

        if (!categoryProducts.length) return;


        const sectionId =
            'category-' +
            category.key
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');


        html += `
            <section
                class="category"
                id="${sectionId}"
            >

                <h2>

                    <span class="category-icon">
                        ${category.icon}
                    </span>

                    ${escapeHtml(category.title)}

                </h2>


                <div class="products-row-wrapper">

                    <div class="products-grid">

                        ${categoryProducts
                            .map(createProductCard)
                            .join('')}

                    </div>


                    <button
                        class="category-scroll-btn"
                        type="button"
                        data-scroll="${sectionId}"
                        aria-label="See more ${escapeHtml(category.title)} products"
                    >

                        <i class="fas fa-chevron-right"></i>

                    </button>

                </div>

            </section>
        `;
    });


    /* OTHER BRANDS */

    if (grouped['Other Brands'].length) {

        html += `
            <section
                class="category"
                id="category-other-brands"
            >

                <h2>

                    <span class="category-icon">
                        
                    </span>

                    Other Brands

                </h2>


                <div class="products-row-wrapper">

                    <div class="products-grid">

                        ${grouped['Other Brands']
                            .map(createProductCard)
                            .join('')}

                    </div>


                    <button
                        class="category-scroll-btn"
                        type="button"
                        data-scroll="category-other-brands"
                        aria-label="See more Other Brands products"
                    >

                        <i class="fas fa-chevron-right"></i>

                    </button>

                </div>

            </section>
        `;
    }


    root.innerHTML = html;
}


/* =========================================
   PC SCROLL BUTTON
========================================= */

function scrollCategory(sectionId) {

    const section =
        document.getElementById(sectionId);

    if (!section) return;


    const row =
        section.querySelector('.products-grid');

    if (!row) return;


    row.scrollBy({
        left: row.clientWidth * 0.75,
        behavior: 'smooth'
    });
}


/* =========================================
   NAVIGATION CATEGORY
========================================= */

function searchCategory(category) {

    const input =
        document.getElementById('product-search');

    if (!input) return;


    /* HOME */

    if (!category) {

        input.value = '';

        filterProducts('');

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        return;
    }


    input.value = category;

    filterProducts(category);


    const config =
        CATEGORY_CONFIG.find(item =>
            item.key.toLowerCase() ===
            category.toLowerCase()
        );


    let sectionId = '';


    if (config) {

        sectionId =
            'category-' +
            config.key
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');

    }


    if (!sectionId) {
        sectionId = 'category-other-brands';
    }


    const section =
        document.getElementById(sectionId);


    if (section) {

        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

    }
}


/* =========================================
   SEARCH FILTER
========================================= */

function filterProducts(searchTerm) {

    const term =
        String(searchTerm || '')
            .trim()
            .toLowerCase();


    const categories =
        document.querySelectorAll('.category');


    let visibleCount = 0;


    categories.forEach(category => {

        const cards =
            category.querySelectorAll('.product-card');

        if (!cards.length) return;


        let categoryMatches = 0;


        const categoryName =
            category.querySelector('h2')
                ?.textContent
                .toLowerCase() || '';


        cards.forEach(card => {

            const searchableText =
                `${card.querySelector('h3')?.textContent || ''} ${card.querySelector('.product-info p')?.textContent || ''} ${categoryName} ${
                    card.querySelector('img')?.alt || ''
                }`.toLowerCase();


            const matches =
                !term ||
                searchableText.includes(term);


            card.style.display =
                matches ? '' : 'none';


            if (matches) {

                categoryMatches++;
                visibleCount++;

            }

        });


        category.style.display =
            categoryMatches > 0 ? '' : 'none';

    });


    const clearButton =
        document.getElementById('search-clear');

    const status =
        document.getElementById('search-status');


    if (clearButton) {

        clearButton.style.display =
            term ? 'block' : 'none';

    }


    if (status) {

        status.style.display =
            term ? 'block' : 'none';

        status.textContent =
            term
                ? `${visibleCount} product${
                    visibleCount === 1 ? '' : 's'
                  } found`
                : '';

    }


    document
        .querySelectorAll('.no-search-results')
        .forEach(el => el.remove());


    if (term && visibleCount === 0) {

        const liveSection =
            document.getElementById('live-products');


        const message =
            document.createElement('div');


        message.className =
            'no-search-results';


        message.style.display =
            'block';


        message.innerHTML = `
            <strong>No products found.</strong>
            <br>
            Try another product name, brand or category.
        `;


        if (liveSection) {

            liveSection.parentNode.insertBefore(
                message,
                liveSection
            );

        }

    }

}


/* =========================================
   SEARCH SETUP
========================================= */

function setupProductSearch() {

    const input =
        document.getElementById('product-search');

    const clearButton =
        document.getElementById('search-clear');


    if (!input) return;


    input.addEventListener('input', () => {

        filterProducts(input.value);

    });


    clearButton?.addEventListener('click', () => {

        input.value = '';

        input.focus();

        filterProducts('');

    });

}


/* =========================================
   LOAD PRODUCTS FROM SUPABASE
========================================= */

async function loadLiveProducts() {

    const { data, error } =
        await supabaseClient
            .from('products')
            .select(
                'id,name,price,category,description,image_url,created_at'
            )
            .eq('active', true)
            .order(
                'created_at',
                { ascending: false }
            );


    if (error) {

        console.error(
            'Could not load Supabase products:',
            error
        );


        const root =
            document.getElementById('supabase-products');


        if (root) {

            root.innerHTML = `
                <p style="
                    text-align:center;
                    color:#b91c1c;
                    padding:30px;
                ">
                    Products are temporarily unavailable.
                    Please try again later.
                </p>
            `;

        }

        return;
    }


    renderLiveProducts(data || []);


    const input =
        document.getElementById('product-search');


    if (input?.value) {

        filterProducts(input.value);

    }

}


/* =========================================
   START
========================================= */

setupProductSearch();

loadLiveProducts();


document.addEventListener('click', e => {
    const a = e.target.closest('[data-cat]');
    if (a) { e.preventDefault(); searchCategory(a.dataset.cat); return; }
    const b = e.target.closest('[data-scroll]');
    if (b) { scrollCategory(b.dataset.scroll); return; }
    const orderBtn = e.target.closest('.order-btn');
    if (orderBtn) { handleOrderClick(orderBtn); }
});

/* =========================================
   ORDER BUTTON: share the real photo when possible
========================================= */

async function handleOrderClick(btn) {

    const text = btn.dataset.orderText || '';
    const imageUrl = btn.dataset.orderImage || '';
    const fallbackUrl = btn.dataset.orderFallback || '';
    const name = btn.dataset.orderName || 'Product';

    // Try the device's native share sheet with the actual image attached.
    // Supported on most phones; WhatsApp shows up as a share target there.
    if (imageUrl && navigator.canShare) {
        try {
            const response = await fetch(imageUrl);
            if (response.ok) {
                const blob = await response.blob();
                const file = new File(
                    [blob],
                    'product.jpg',
                    { type: blob.type || 'image/jpeg' }
                );

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], text, title: name });
                    return; // shared with the real image attached — done
                }
            }
        } catch (err) {
            if (err && err.name === 'AbortError') return; // user cancelled the share sheet
            // otherwise fall through to the WhatsApp link fallback below
        }
    }

    // Fallback (desktop browsers, or if sharing failed): open WhatsApp chat
    // directly with the order text, including the image link.
    if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener');
    }
}
