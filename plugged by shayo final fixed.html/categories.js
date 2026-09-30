/* =========================================================
   Plugged by Shayo - category definitions
   ---------------------------------------------------------
   ONE place that defines every category.
   Loaded by index.html, admin.html and build.js, so the shop
   page, the owner panel and the pre-renderer can never drift
   apart again.

   Works in the browser (window.PBS) and in Node (module.exports).
   ========================================================= */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;          // Node / build.js
    } else {
        root.PBS = Object.assign(root.PBS || {}, api); // browser
    }
})(typeof self !== 'undefined' ? self : this, function () {

    'use strict';

    /* -----------------------------------------------------
       The categories, in the order they appear on the page.
       `key`     is what gets stored in Supabase and used in ?cat=
       `title`   is what customers see
       `aliases` are the spellings that should map onto this
                 category when the owner types them in the panel
       ----------------------------------------------------- */
    var CATEGORIES = [
        { key: 'Nike',             title: 'Nike',         aliases: ['nike', 'nike shoes'] },
        { key: 'Jordan',           title: 'Jordans',      aliases: ['jordan', 'jordans', 'air jordan'] },
        { key: 'Airforce',         title: 'Airforce',     aliases: ['airforce', 'air force', 'air force 1', 'af1'] },
        { key: 'Airmax',           title: 'Air Max',      aliases: ['airmax', 'air max', 'tn', 'vapormax', 'vapor max'] },
        { key: 'Vans',             title: 'Vans',         aliases: ['vans'] },
        { key: 'New Balance',      title: 'New Balance',  aliases: ['new balance', 'newbalance', 'nb'] },
        { key: 'Samba',            title: 'Samba',        aliases: ['samba'] },
        { key: 'Converse',         title: 'Converse',     aliases: ['converse', 'chuck taylor'] },
        { key: 'slides',           title: 'Sandals',      aliases: ['slides', 'slide', 'sandals', 'sandal', 'chaco', 'chacos'] },
        { key: 'Puma',             title: 'Puma',         aliases: ['puma'] },
        { key: 'ASICS',            title: 'ASICS',        aliases: ['asics', 'asics'] },
        { key: 'Timberland',       title: 'Timberland',   aliases: ['timberland', 'timbs'] },
        { key: 'Dr martens boots', title: 'Dr Martens',   aliases: ['dr martens boots', 'dr martens', 'doc martens', 'martens'] },
        { key: 'Clark',            title: 'Clarks',       aliases: ['clark', 'clarks'] },
        { key: 'Numeris',          title: 'Numeris',      aliases: ['numeris'] },
        { key: 'Adidas',           title: 'Adidas',       aliases: ['adidas', 'addidas'] },
        { key: 'New era',          title: 'New Era Caps', aliases: ['new era', 'newera', 'caps', 'cap'] }
    ];

    /* Anything unmatched lands here (never stored in Supabase) */
    var OTHER_KEY = 'Other Brands';
    var OTHER_TITLE = 'Other Brands';

    /* -----------------------------------------------------
       Brands that own MORE THAN ONE section in the shop.

       A product stored with the broad brand "Nike" must still be
       free to land in Air Max or Airforce, so "Nike" is not treated
       as a final answer. Brands with a single section (Adidas,
       Puma, Vans, ...) are trusted outright.

       This is the fix for the empty Air Max / Airforce sections:
       the old code tested "does it contain nike?" first, so
       "Nike Airmax 95" was filed as plain Nike.
       ----------------------------------------------------- */
    var BROAD_BRANDS = ['Nike', 'Adidas'];

    /* -----------------------------------------------------
       Model / brand rules, tried in order.

       ORDER MATTERS: specific models before their parent brand.
       ----------------------------------------------------- */
    var RULES = [
        /* Nike family - model before brand */
        { cat: 'Airmax',           any: ['airmax', 'air max', 'vapormax', 'vapor max', 'air tn', 'tn'] },
        { cat: 'Airforce',         any: ['airforce', 'air force', 'af1'] },
        { cat: 'Jordan',           any: ['jordan', 'jumpman'] },
        { cat: 'Nike',             any: ['nike', 'shox', 'dunk', 'nocta'] },

        /* Adidas family - Samba is a model, Yeezy slides are sandals */
        { cat: 'Samba',            any: ['samba'] },
        { cat: 'slides',           any: ['yeezy slide', 'slide', 'sandal'] },
        { cat: 'Adidas',           any: ['adidas', 'yeezy'] },

        { cat: 'New Balance',      any: ['new balance', 'newbalance'] },
        { cat: 'Converse',         any: ['converse', 'chuck taylor', 'all star'] },
        { cat: 'Vans',             any: ['vans', 'knu skool', 'old skool'] },
        { cat: 'Puma',             any: ['puma', 'fenty'] },
        { cat: 'ASICS',            any: ['asics'] },
        { cat: 'Timberland',       any: ['timberland', 'timbs'] },
        { cat: 'Dr martens boots', any: ['martens', 'doc martin', 'dr martin'] },
        { cat: 'Clark',            any: ['clark'] },
        { cat: 'Numeris',          any: ['numeris'] },
        { cat: 'New era',          any: ['new era', 'newera', 'fitted hat', 'snapback', 'trucker hat'] }
    ];

    /** Find the category whose key or alias matches this exact string */
    function findByAlias(value) {
        var v = String(value || '').toLowerCase().trim();
        if (!v) return null;
        for (var i = 0; i < CATEGORIES.length; i++) {
            var c = CATEGORIES[i];
            if (c.key.toLowerCase() === v) return c;
            if (c.aliases && c.aliases.indexOf(v) !== -1) return c;
        }
        return null;
    }

    /* Whole-word matching, so "tn" does not match inside "return"
       and "slides" does not match inside "backslides". */
    function hasTerm(haystack, term) {
        if (term.indexOf(' ') !== -1) return haystack.indexOf(term) !== -1;
        return new RegExp('(^|[^a-z0-9])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i')
            .test(haystack);
    }

    /**
     * Work out which category a product belongs to.
     * Looks at BOTH the stored category and the product name, because the
     * owner usually stores the broad brand ("Nike") while the product name
     * carries the actual model ("Nike Airmax 95").
     *
     * @param {object} product - needs .category and optionally .name
     * @returns {string} a category key, or 'Other Brands'
     */
    function classify(product) {
        var category = String((product && product.category) || '').toLowerCase().trim();
        var name = String((product && product.name) || '').toLowerCase().trim();
        var both = category + ' ' + name;

        /* 1. The stored category wins when it names a specific model
              ("Air Max") or a brand that has exactly one section
              ("Adidas", "Puma", "Vans"). */
        var exact = findByAlias(category);
        var isBroadBrand = exact && BROAD_BRANDS.indexOf(exact.key) !== -1;

        if (exact && !isBroadBrand) {
            return exact.key;
        }

        /* 2. Otherwise look for a specific model, then a brand. This is
              what finally fills Air Max, Airforce and Samba. */
        for (var j = 0; j < RULES.length; j++) {
            var rule = RULES[j];
            for (var k = 0; k < rule.any.length; k++) {
                if (hasTerm(both, rule.any[k])) return rule.cat;
            }
        }

        /* 3. Fall back to the stored broad brand. */
        if (exact) return exact.key;

        return OTHER_KEY;
    }

    /** 'New Balance' -> 'category-new-balance' (used as the section id) */
    function sectionId(key) {
        return 'category-' + String(key).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    /** Title to display for a category key */
    function titleFor(key) {
        if (key === OTHER_KEY) return OTHER_TITLE;
        for (var i = 0; i < CATEGORIES.length; i++) {
            if (CATEGORIES[i].key === key) return CATEGORIES[i].title;
        }
        return key || OTHER_KEY;
    }

    /** Is this a category we show in the navigation / dropdown? */
    function isKnown(key) {
        if (key === OTHER_KEY) return true;
        return CATEGORIES.some(function (c) { return c.key === key; });
    }

    /** All the keys, for building a <select> in the owner panel */
    function keys() {
        return CATEGORIES.map(function (c) { return c.key; });
    }

    return {
        CATEGORIES: CATEGORIES,
        OTHER_KEY: OTHER_KEY,
        OTHER_TITLE: OTHER_TITLE,
        classify: classify,
        sectionId: sectionId,
        titleFor: titleFor,
        isKnown: isKnown,
        keys: keys
    };
});
