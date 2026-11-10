// Holiday seasons: the site picks the current one by date (Mountain time) and uses it to
// put that season's shirts first and add a light seasonal decoration in the same colors.
// To preview another season, visit any page with ?season=christmas (?season=off goes back to the real date).

const TZ = "America/Denver";

// Today's date in Utah as { y, m (1-12), d }
export function today(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, +p.value]));
  return { y: parts.year, m: parts.month, d: parts.day };
}
const num = (m, d) => m * 100 + d;   // 1125 = Nov 25, easy to compare

// Easter Sunday (Gregorian calendar)
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return { m: month, d: day };
}
// Thanksgiving: fourth Thursday of November
function thanksgiving(y) {
  const firstDow = new Date(Date.UTC(y, 10, 1)).getUTCDay();   // 0 = Sunday
  return 1 + ((4 - firstDow + 7) % 7) + 21;
}
// A date a number of days before (m, d)
function minusDays(y, m, d, days) {
  const t = new Date(Date.UTC(y, m - 1, d - days));
  return { m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const words = re => p => re.test([p.name, p.category, p.seasonalCategory, ...(p.tags || [])].join(" "));
const not = re => p => !re.test([p.name, p.category, ...(p.tags || [])].join(" "));

// In calendar order. Each: when it runs, the greeting, which shirts belong, and what's coming next.
export const SEASONS = [
  { id: "valentines", name: "Valentine's Day", icon: "heart",
    range: y => [num(1, 25), num(2, 14)],
    greeting: "Valentine's Day is coming", link: "/shop", linkText: "Shirts for someone you love",
    match: words(/valentine|heart|love/i) },
  { id: "easter", name: "Easter", icon: "egg",
    range: y => { const e = easter(y), s = minusDays(y, e.m, e.d, 21); return [num(s.m, s.d), num(e.m, e.d)]; },
    greeting: "He is risen. Happy Easter", link: "/shop?c=faith", linkText: "Easter and faith shirts",
    match: words(/easter|risen|resurrection|jesus|christ|scripture/i) },
  { id: "july4", name: "the 4th of July", icon: "star",
    range: y => [num(6, 20), num(7, 4)],
    greeting: "Happy 4th of July", link: "/shop", linkText: "Shop shirts",
    match: words(/july|usa|america|patriot|liberty/i) },
  { id: "backtoschool", name: "back to school", icon: "apple",
    range: y => [num(7, 25), num(8, 31)],
    greeting: "Back to school", link: "/groups", linkText: "Class and group shirts",
    match: words(/back to school|school|teacher|class/i) },
  { id: "halloween", name: "Halloween", icon: "pumpkin",
    range: y => [num(9, 15), num(11, 2)],   // through Día de los Muertos
    greeting: "Spooky season is here", link: "/shop?c=halloween-fall", linkText: "Halloween shirts",
    match: words(/halloween|witch|ghost|skeleton|skull|spooky|muertos|pumpkin|bat\b/i), next: "thanksgiving" },
  { id: "thanksgiving", name: "Thanksgiving", icon: "turkey",
    range: y => [num(11, 3), num(11, thanksgiving(y))],
    greeting: "Happy Thanksgiving from our family to yours", link: "/shop?c=christmas", linkText: "Christmas shirts are here",
    match: p => words(/\bfall\b|autumn|thank|grateful|harvest|pumpkin|turkey/i)(p) && not(/halloween|witch|ghost|skeleton|skull|muertos/i)(p),
    next: "christmas" },
  { id: "christmas", name: "Christmas", icon: "ornament",
    range: y => [num(11, thanksgiving(y) + 1), num(12, 26)],
    greeting: "Merry Christmas", link: "/shop?c=christmas", linkText: "Christmas shirts",
    match: words(/christmas|nativity|wise men|names of jesus|santa|snow|reindeer|noel/i) },
];
const byId = Object.fromEntries(SEASONS.map(s => [s.id, s]));

// The season for a date, or null between holidays
export function seasonFor(now = new Date()) {
  const { y, m, d } = today(now);
  const n = num(m, d);
  return SEASONS.find(s => { const [a, b] = s.range(y); return n >= a && n <= b; }) || null;
}

// Middleware: res.locals.season = { ...season, products(list), upcoming } (preview with ?season=)
export function seasonMiddleware(req, res, next) {
  const q = String(req.query.season || "");
  if (q && req.session) req.session.seasonPreview = byId[q] ? q : undefined;
  const preview = req.session?.seasonPreview;
  const season = (preview && byId[preview]) || seasonFor();
  res.locals.season = season ? { ...season, preview: Boolean(preview), upcoming: season.next ? byId[season.next] : null } : null;
  next();
}

// Seasonal shirts first, keeping the rest in their usual order
export function seasonFirst(products, season) {
  if (!season) return products;
  const inSeason = products.filter(season.match);
  return [...inSeason, ...products.filter(p => !inSeason.includes(p))];
}
