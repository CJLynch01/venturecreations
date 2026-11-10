// Shop settings in one place: collections, shirt colors, group pricing, mission builder options.
// Change these to change the site; no other file needs to know the numbers.

// Collections are matched against each product's category, tags, season and name (case-insensitive).
// "Just for fun" catches everything that doesn't match another collection.
export const COLLECTIONS = [
  { id: "faith", name: "Mission & faith", match: /mission|christ|faith|jesus|easter|church|scripture/i },
  { id: "christmas", name: "Christmas", match: /christmas|nativity|wise men/i },
  { id: "mental-health", name: "Mental health", match: /mental|semicolon|press on/i },
  { id: "cats", name: "Cats", match: /\bcats?\b|animal/i },
  { id: "muertos", name: "Día de los Muertos", match: /muertos/i },
  { id: "halloween-fall", name: "Halloween & fall", match: /halloween|fall|autumn|witch/i },
  { id: "fun", name: "Just for fun", match: null },
];

export function collectionsFor(product) {
  const text = [product.category, product.seasonalCategory, product.name, ...(product.tags || [])].join(" ");
  const ids = COLLECTIONS.filter(c => c.match && c.match.test(text)).map(c => c.id);
  return ids.length ? ids : ["fun"];
}

// Swatch colors for the shirt color names she uses. Unknown names fall back to a neutral gray.
const COLOR_HEX = {
  "black": "#1d1d20", "white": "#f7f7f5", "navy blue heather": "#3c4664", "navy": "#26304d",
  "heather mauve": "#c3a2a8", "dark heather gray": "#4b4d52", "dark heather grey": "#4b4d52",
  "light heather gray": "#c9cacd", "atlantic green": "#3d6c68", "olive green": "#6b6b3e", "olive": "#6b6b3e",
  "red": "#b3262e", "maroon": "#6b1f2b", "marron": "#6b1f2b", "charity pink": "#f2a7c3", "pink": "#f2a7c3",
  "autumn": "#b5652c", "forest green": "#2f4d36", "heather gray": "#9a9ca1", "sand": "#d9c7a7",
};
export const colorHex = name => COLOR_HEX[String(name || "").trim().toLowerCase()] || "#9a9ca1";
export const isDarkColor = name => {
  const h = colorHex(name).slice(1);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
};

// Bulk pricing: applies to the whole cart by total shirt count. (Suggested tiers; Elisha sets the real ones.)
export const BULK_TIERS = [
  { min: 48, off: 0.20 },
  { min: 24, off: 0.15 },
  { min: 12, off: 0.10 },
];
export function bulkDiscount(totalShirts) {
  const tier = BULK_TIERS.find(t => totalShirts >= t.min);
  return tier ? tier.off : 0;
}
export const nextTier = totalShirts => [...BULK_TIERS].reverse().find(t => t.min > totalShirts) || null;

export const FREE_SHIPPING_OVER = 100;   // dollars
export const SHIPPING_FLAT = 4.99;       // shown in the cart; Stripe's shipping rate is what actually charges
export const TAX_ESTIMATE = 0.0725;      // shown as an estimate only; Stripe calculates the real tax

// Custom mission shirt: the state or country in the middle, four things the customer types in
// (two on each side) and the mission name in script. Elisha draws the art.
// Custom mission shirts, ordered on /mission. Each style is the product whose name matches.
//   original: state or country in the middle, four things around it, mission name underneath
//   flag:     the country's flag with the mission name
export const MISSION_STYLES = [
  { id: "original", name: "The Original", match: /custom missionary shirt/i, things: true,
    blurb: "Your state or country in the middle with a heart on the mission, two things on each side, and the mission name underneath." },
  { id: "flag", name: "Missionary Flag", match: /missionary flag/i, things: false,
    blurb: "The flag of the country where they serve, with the mission name." },
];
export const missionStyleOf = p => MISSION_STYLES.find(s => s.match.test(p?.name || "")) || null;
export const MISSION_MATCH = MISSION_STYLES[0].match;   // The Original
// Products tagged "personalize" get a text box on their page (e.g. the Missionary Flag shirt: country and mission name)
export const isPersonalized = p => (p.tags || []).some(t => /personali[sz]e/i.test(t));
// Size chart shown on product pages (inches). Sample numbers for a Bella+Canvas 3001; swap in her blank's chart.
export const SIZE_CHART = {
  sizes: ["S", "M", "L", "XL", "2XL"],
  rows: [["Body width", 18, 20, 22, 24, 26], ["Body length", 28, 29, 30, 31, 32]],
  note: "Unisex fit, true to size. Size up for a looser look.",
};
