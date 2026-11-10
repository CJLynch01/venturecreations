// Search engine and link-preview helpers: readable product addresses, full links,
// page descriptions and the structured data Google and Pinterest read.
import { COLLECTIONS, collectionsFor, missionStyleOf } from "../config/shop.js";

export const SITE_NAME = "Venture Creations";
export const ETSY_URL = "https://www.etsy.com/shop/VentureCreationShop";

// "Bloom Where You're Buried" -> "bloom-where-youre-buried"
export function slugify(text) {
  return String(text || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80) || "shirt";
}

// Gives every product a unique .slug (oldest product keeps the plain name if two match)
export function withSlugs(products) {
  const taken = new Map();
  const byAge = [...products].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  for (const p of byAge) {
    let s = slugify(p.name);
    if (taken.has(s)) s = `${s}-${String(p._id).slice(-5)}`;
    taken.set(s, true);
    p.slug = s;
  }
  return products;
}

export const siteUrl = req => `${req.protocol}://${req.get("host")}`;
export const absolute = (req, src) => !src ? "" : /^https?:\/\//.test(src) ? src : siteUrl(req) + (src.startsWith("/") ? src : "/" + src);
export const productPath = p => `/shop/${p.slug || p._id}`;

// One or two plain sentences for search results when she hasn't written a description
export function productSummary(p) {
  if (p.description) return p.description.replace(/\s+/g, " ").trim().slice(0, 155);
  // The most specific collection it's in (e.g. Christmas rather than Mission & faith)
  const coll = COLLECTIONS.filter(c => collectionsFor(p).includes(c.id)).pop();
  const colors = (p.colors || []).slice(0, 4);
  const colorText = colors.length > 1 ? `${colors.slice(0, -1).join(", ")} and ${colors.at(-1)}` : colors[0] || "";
  const kind = missionStyleOf(p) ? "Custom missionary shirt" : `${p.name} t-shirt`;
  const from = coll && coll.id !== "fun" ? `from the Venture Creations ${coll.name} collection` : "from Venture Creations";
  return `${kind} ${from}. $${p.price.toFixed(2)}, made to order${colorText ? ` in ${colorText}` : ""}.`.slice(0, 160);
}

// schema.org data for a product page (shows price and photo in Google, used by Merchant Center and Pinterest)
export function productJsonLd(req, p) {
  const url = siteUrl(req) + productPath(p);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: productSummary(p),
    image: (p.images || []).slice(0, 6).map(src => absolute(req, src)),
    sku: String(p._id),
    brand: { "@type": "Brand", name: SITE_NAME },
    category: "Apparel & Accessories > Clothing > Shirts & Tops",
    ...(p.colors?.length ? { color: p.colors.join(", ") } : {}),
    ...(p.sizes?.length ? { size: p.sizes.join(", ") } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: p.price.toFixed(2),
      availability: "https://schema.org/InStock",   // made to order
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function breadcrumbJsonLd(req, items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(req) + it.path })),
  };
}

export function storeJsonLd(req) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: SITE_NAME,
    url: siteUrl(req) + "/",
    logo: siteUrl(req) + "/images/VentureCreations.webp",
    description: "Custom shirts for every venture: custom missionary shirts, faith, mental health, cats, Día de los Muertos and seasonal tees, made to order.",
    sameAs: [ETSY_URL],
  };
}
