# Plugged by Shayo — website

Authentic sneakers, sandals and streetwear in Nairobi, Kenya.
**Live site:** https://pluggedbyshayowearyourvibe.edgeone.dev/

Products are managed by the owner in a password-protected panel (`admin.html`)
and stored in Supabase. This repository builds them into plain static HTML so
that Google, WhatsApp and Facebook can actually see the catalogue.

---

## Quick start

```bash
node build.js          # generates the complete site into dist/
```

Upload **everything inside `dist/`** to your host. That is the whole workflow.

```bash
npm run verify         # checks the built site (53 automated checks)
npm run check          # syntax-checks the JavaScript
```

Node 18 or newer is required.

---

## Customer cannot log in to the owner panel?

Run this. It asks Supabase directly and prints exactly what it says:

```bash
node login-test.js you@example.com "your password"
```

It reports one of:

| Result | Meaning | Fix |
|---|---|---|
| `LOGIN SUCCESSFUL` | Credentials are fine | The problem is the browser, not the account |
| `invalid_credentials` | Wrong email or password | Use **Forgot password?** on the admin page |
| `email_not_confirmed` | Address never confirmed | Confirm it in the dashboard, or disable confirmation |
| `500` / `503` / timeout | Project paused | Open the Supabase dashboard and restore the project |

It sends nothing anywhere except to your own Supabase project, and it never
stores your password.

**Important:** the Supabase *database* and the Supabase *user list* are separate.
Your 206 products can be perfectly fine while your login account does not exist.
If `login-test.js` says `invalid_credentials`, open the Supabase dashboard and
check **Authentication → Users**. If your email is not listed there, the account
has to be created again (or invited) — that is a dashboard job, not a code job.

Also worth checking under **Authentication → URL Configuration**: the **Site URL**
and **Redirect URLs** must include your live domain. If Site URL still points at
`localhost` or an old `edgeone.dev` subdomain, emails and confirmation links will
send people to the wrong place.

---

## Repository layout

```
index.template.html   <- the page you edit by hand (source)
styles.css            <- site styling
app.js                <- shop logic: search, categories, order buttons
categories.js         <- the ONE list of product categories
login-test.js         <- diagnoses owner-login problems
build.js              <- turns the template + Supabase data into dist/
verify.js             <- automated checks on the built site
admin.html/.js/.css   <- the owner's product panel
background-image.*    <- page background (WebP + JPEG fallback)
favicon.svg / .ico    <- icons (the main favicon is embedded in the HTML)
404.html              <- page shown for a wrong address
robots.txt            <- written by build.js
sitemap.xml           <- written by build.js
.github/workflows/    <- automatic build + deploy, and a nightly refresh

dist/                 <- GENERATED. Never edit it. Never commit it.
```

**Do not edit `dist/` or the `index.html` inside it.** It is deleted and rebuilt
every time you run `build.js`.

---

## Publishing with GitHub Pages (automatic)

Push this repository to GitHub, then:

1. **Settings → Pages → Build and deployment → Source** → choose
   **GitHub Actions**.
2. Push to `main`. The workflow builds the site and publishes it.

After that it maintains itself:

* **every push** rebuilds and redeploys;
* **every night at 02:00 UTC** (05:00 Nairobi) it rebuilds, so products you add
  through the owner panel reach Google without you doing anything;
* if the build cannot reach Supabase, or produces zero products, the workflow
  **fails instead of deploying** — so you can never accidentally publish an
  empty shop.

You can also run it by hand: **Actions → Build and deploy site → Run workflow**.

### Using a different host instead

If you keep using EdgeOne Pages, upload the contents of `dist/`. Either run
`node build.js` locally, or download the `github-pages` artifact from a
completed workflow run.

### Real domain

If you buy a domain (recommended — a `.co.ke` is a few thousand shillings a
year), set it **once**:

**Settings → Secrets and variables → Actions → Variables → New variable**

Name: `SITE_URL`  Value: `https://yourdomain.co.ke`

The canonical tag, `og:url`, `sitemap.xml`, `robots.txt` and all product
structured data then follow that domain automatically. Nothing else to change.

---

## Why the build step exists — and why it matters for Google

**This was the single biggest problem with the old site.**

The products were added to the page by JavaScript *after* the page loaded and
Supabase replied. Google usually does not run that JavaScript, so what Google
actually saw was this:

```html
<div id="supabase-products">Loading products...</div>
```

No products. No brands. No prices. Nothing to rank for. A shop with 206 products
was invisible.

Now `build.js` writes all 206 products, with prices and photos, straight into
the HTML. Google sees the real shop on first load.

### The bug that was actively blocking Google

The old `index.html` contained:

```html
<link rel="canonical" href="https://l.instagram.com/?u=https%3A%2F%2Fchanging-coral-pdbgp5ia.edgeone.dev%2F...">
```

A canonical tag tells Google *"the real address of this page is…"*. Yours said
the real address was **an Instagram redirect** and **an old edgeone.dev
subdomain that no longer exists**. It is very likely why the site never ranked.
It now correctly points at your own domain.

---

## SEO checklist — what is done, and what only you can do

### Done, automatically

| Item | Status |
|---|---|
| Canonical URL | Correct, follows `SITE_URL` |
| Products in raw HTML | All 206, rebuilt on every push |
| `Product` + `Offer` structured data | All 206, prices in KES |
| `ClothingStore` structured data | Name, address, phone, area served |
| `FAQPage` structured data | 3 buyer questions |
| Title + meta description | Written with real search terms |
| Open Graph + Twitter cards | Including a real product photo |
| `robots.txt` | Allows crawling, blocks the owner panel |
| `sitemap.xml` | With a `lastmod` date, regenerated each build |
| Mobile responsive | Yes, 3 cards across on a phone |
| Images | Lazy-loaded, sized (no layout shift), all with alt text |
| Background image | 1,244 KB → **104 KB** WebP (92% smaller) |
| Breaking errors fixed | Invalid CSS, broken nav HTML, de-duplicated CSS |

### What only you can do

1. **Submit the site to Google Search Console**
   → https://search.google.com/search-console
   Your verification tag is already in the page. Add the site, then use
   **URL inspection → Request indexing**. Do this after your first deploy.
   This is how you find out whether the canonical fix worked.

2. **Buy a real domain.** `pluggedbyshayowearyourvibe.edgeone.dev` is almost
   impossible to say out loud or type from memory. This costs you sales daily.
   When you have one, set the `SITE_URL` variable and the whole site follows.

3. **Give products real names.** Several are just `Nike`, `Vans` or `Converse`.
   "Nike Air Force 1 white" is what people actually search for. This is free
   ranking and takes a minute per product in the owner panel.

4. **Add sizes to more descriptions.** Customers skip products when they cannot
   tell whether their size is available.

5. **List the shop on Google Business Profile.** For a Nairobi shop this drives
   more local traffic than anything else on this list.

---

## The "Order this product" button

It is a plain link straight to WhatsApp with the order already typed out:

```
Hello Plugged by Shayo! I would like to ORDER this product.

Product: Nike Airmax 95 x Scorpion
Price: Ksh. 3,800/=
Sizes / details: Available sizes 39-44, black and white
Photo: https://.../photo.jpg

My size: ______
My location: ______
```

* Works on **every** device, because it is a normal hyperlink, not JavaScript.
* Includes the **photo link**, so WhatsApp shows the shoe and the customer can
  forward the whole message.
* Pre-fills **size** and **location**, so most customers answer those before
  sending — two fewer questions per order.
* Longest link is 617 characters; WhatsApp only truncates past ~2000.

The second button, **"Inquire product"**, is for enquiries rather than orders.

---

## Favicon

**`favicon.ico` is the icon that is used.** It is listed first in the HTML,
because browsers pick the first icon they understand, and `favicon.svg` follows
as a fallback for the rare browser that cannot read `.ico`.

**Known limitation:** `favicon.ico` contains a single **16×16** image — the
smallest size still in use. On a modern high-resolution screen it will therefore
look soft. This is a property of the file itself, not of the HTML: a browser
cannot display detail that is not there.

If you can supply the original logo at any decent size, a proper icon set can be
generated from it — 16, 32, 48, 180, 192 and 512 pixel versions, plus
`apple-touch-icon.png` for iOS home screens. That is a one-step job once a larger
source image exists.

`favicon.svg` is a `PS` monogram placeholder in your brand blue, not the real
logo. It only matters for browsers that skip `.ico`.

---

## Product categories

`categories.js` is the single source of truth, shared by the website, the owner
panel and the build script. The owner panel's category field is a dropdown built
from this list, so a product can no longer be saved under a spelling the website
does not recognise.

The classifier reads **both** the stored category and the product name, and tests
specific models **before** the parent brand. That ordering was the bug that kept
Air Max, Airforce, Samba and Sandals permanently empty — because the old code
asked "does this contain nike?" first, and "Nike" is the stored category for
almost every Nike shoe.

Current result on the live catalogue:

| Category | Empty before | Now |
|---|---|---|
| Air Max | 1 | 34 |
| Airforce | 0 | 10 |
| Samba | 0 | 6 |
| Sandals | 0 | 10 |
| Other Brands | 13 | 6 |

All 206 products appear exactly once.

---

## Security notes

* The Supabase publishable key in the client files is **designed to be public**.
  Your data is protected by Supabase Row Level Security policies, not by hiding
  the key. Keep RLS enabled and make sure only the owner account can write.
* `admin.html` is marked `noindex` and disallowed in `robots.txt`.
* Product names and descriptions are escaped before insertion into the page, so
  a product name cannot inject HTML or JavaScript.
* Image URLs are restricted to `https:` only.
