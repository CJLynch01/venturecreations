// Site analytics kept in our own database: page views, shirts viewed, where visitors come from,
// add-to-cart and checkout. Admins and bots aren't counted. Read by the admin Analytics page.
import crypto from "crypto";
import Visit from "../models/Visit.js";
import Order from "../models/Order.js";

const TZ = "America/Denver";
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch/i;
const SKIP = /^\/(admin|api|auth|webhook|cart\/count|sitemap\.xml|robots\.txt|favicon)|\.\w{2,5}$/;

export const dayOf = d => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

const SOURCES = [
  [/google\./, "Google"], [/bing\.|duckduckgo|yahoo\.|ecosia|search\.brave/, "Other search"],
  [/pinterest\.|pin\.it/, "Pinterest"], [/facebook\.|fb\.|messenger/, "Facebook"], [/instagram\./, "Instagram"],
  [/etsy\./, "Etsy"], [/tiktok\./, "TikTok"], [/mail\.|outlook|gmail/, "Email"],
];
function source(req) {
  const utm = String(req.query.utm_source || "").toLowerCase();
  if (utm) return SOURCES.find(([re]) => re.test(utm + "."))?.[1] || utm.slice(0, 30);
  let host = "";
  try { host = new URL(req.get("referer") || "").hostname.replace(/^www\./, ""); } catch { return "Direct"; }
  if (!host || host === req.hostname.replace(/^www\./, "")) return "";   // a click inside the site
  return SOURCES.find(([re]) => re.test(host))?.[1] || host.slice(0, 60);
}
const device = ua => /ipad|tablet|kindle|silk/i.test(ua) ? "Tablet" : /mobi|iphone|android/i.test(ua) ? "Phone" : "Computer";

function visitorId(req, day) {
  const secret = process.env.SESSION_SECRET || "vc";
  return crypto.createHash("sha256").update(`${secret}|${day}|${req.ip}|${req.get("user-agent") || ""}`).digest("base64url").slice(0, 16);
}

// Express middleware: records shopper page views and cart/checkout steps after the response is sent
export function trackVisits(req, res, next) {
  const ua = req.get("user-agent") || "";
  const isAdmin = req.user?.role === "Admin";
  if (isAdmin || !ua || BOT.test(ua) || process.env.ANALYTICS_OFF === "1") return next();

  let kind = null;
  if (req.method === "GET" && !SKIP.test(req.path) && !req.xhr && (req.get("accept") || "").includes("text/html")) kind = "page";
  else if (req.method === "POST" && /^\/cart\/(add|custom|group)$/.test(req.path)) kind = "cart";
  else if (req.method === "POST" && req.path === "/checkout/create-checkout-session") kind = "checkout";
  if (!kind) return next();

  // Read these now; the session and query are still here before the route runs
  const ref = kind === "page" ? source(req) : "";
  const q = req.path === "/search" ? String(req.query.q || "").trim().toLowerCase().slice(0, 60) : "";
  res.on("finish", () => {
    if (res.statusCode !== 200) return;
    const at = new Date(), day = dayOf(at);
    Visit.create({ at, day, kind, path: req.path.slice(0, 120), ref, device: device(ua), visitor: visitorId(req, day), q: q || undefined })
      .catch(err => console.error("Analytics save failed:", err.message));
  });
  next();
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

// Everything the Analytics page shows, for the last `days` days (with the period before for comparison)
export async function analyticsData(days, productNames) {
  const now = new Date();
  const start = new Date(now.getTime() - (days - 1) * 864e5);
  const startDay = dayOf(start), prevStartDay = dayOf(new Date(start.getTime() - days * 864e5));
  const inRange = { day: { $gte: startDay } }, inPrev = { day: { $gte: prevStartDay, $lt: startDay } };

  const count = (match, field) => Visit.aggregate([{ $match: match }, { $group: { _id: field ? `$${field}` : null, n: { $sum: 1 }, v: { $addToSet: "$visitor" } } },
    { $project: { n: 1, v: { $size: "$v" } } }, { $sort: { v: -1, n: -1 } }]);
  const visitors = async match => (await Visit.aggregate([{ $match: match }, { $group: { _id: { d: "$day", v: "$visitor" } } }, { $count: "n" }]))[0]?.n || 0;

  const [byDay, pages, sources, devices, searches, totals, prevTotals, uniq, prevUniq, carts, checkouts, prevCarts, orders, prevOrders, shirtViewers] = await Promise.all([
    Visit.aggregate([{ $match: { ...inRange, kind: "page" } }, { $group: { _id: "$day", n: { $sum: 1 }, v: { $addToSet: "$visitor" } } }, { $project: { n: 1, v: { $size: "$v" } } }]),
    count({ ...inRange, kind: "page" }, "path"),
    count({ ...inRange, kind: "page", ref: { $nin: ["", null] } }, "ref"),
    count({ ...inRange, kind: "page" }, "device"),
    count({ ...inRange, kind: "page", q: { $nin: ["", null] } }, "q"),
    Visit.countDocuments({ ...inRange, kind: "page" }),
    Visit.countDocuments({ ...inPrev, kind: "page" }),
    visitors({ ...inRange, kind: "page" }),
    visitors({ ...inPrev, kind: "page" }),
    count({ ...inRange, kind: "cart" }),
    count({ ...inRange, kind: "checkout" }),
    count({ ...inPrev, kind: "cart" }),
    Order.find({ createdAt: { $gte: new Date(startDay + "T00:00:00-07:00") } }).lean(),
    Order.countDocuments({ createdAt: { $gte: new Date(prevStartDay + "T00:00:00-07:00"), $lt: new Date(startDay + "T00:00:00-07:00") } }),
    visitors({ ...inRange, kind: "page", path: /^\/shop\/[^/]+$/ }),
  ]);

  // Every day in the range, including quiet ones
  const map = new Map(byDay.map(d => [d._id, d]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dayOf(new Date(now.getTime() - i * 864e5));
    series.push({ day: d, visitors: map.get(d)?.v || 0, views: map.get(d)?.n || 0 });
  }

  const shirts = pages.filter(p => /^\/shop\/[^/]+$/.test(p._id)).map(p => ({ name: productNames.get(p._id) || p._id.replace("/shop/", ""), path: p._id, views: p.n, visitors: p.v })).slice(0, 10);
  const NAMED = { "/": "Home", "/shop": "Shop", "/custom": "Custom shirts", "/mission": "Custom shirts", "/groups": "Group orders",
    "/search": "Search results", "/blog": "Blog", "/contact": "Contact", "/cart": "Cart", "/success": "Order thank-you page" };
  const label = p => NAMED[p] || productNames.get(p) || (p.startsWith("/blog/") ? "Blog: " + p.slice(6).replace(/-/g, " ") : p);
  const cartN = carts[0]?.n || 0, checkoutN = checkouts[0]?.n || 0;

  return {
    days, startDay,
    series,
    totals: {
      visitors: uniq, prevVisitors: prevUniq, views: totals, prevViews: prevTotals,
      carts: cartN, prevCarts: prevCarts[0]?.n || 0, orders: orders.length, prevOrders,
      sales: orders.reduce((a, o) => a + (o.total || 0), 0), conversion: pct(orders.length, uniq),
    },
    funnel: [
      { label: "Visited the site", n: uniq },
      { label: "Looked at a shirt", n: shirtViewers },
      { label: "Added to cart", n: carts[0]?.v || 0 },
      { label: "Started checkout", n: checkouts[0]?.v || 0 },
      { label: "Paid", n: orders.length },
    ],
    shirts,
    pages: pages.slice(0, 10).map(p => ({ label: label(p._id), path: p._id, views: p.n, visitors: p.v })),
    sources: sources.slice(0, 8).map(s => ({ label: s._id, visitors: s.v })),
    devices: devices.map(d => ({ label: d._id, visitors: d.v })),
    searches: searches.slice(0, 10).map(s => ({ label: s._id, n: s.n })),
    checkoutN,
  };
}
