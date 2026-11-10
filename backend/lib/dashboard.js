// Numbers for the admin dashboard: this month's orders and sales, the print-and-ship queue,
// weekly sales, top sellers, messages, ideas and the setup checklist.
import Order from "../models/Order.js";
import Product from "../models/product.js";
import ContactMessage from "../models/ContactMessage.js";
import Idea from "../models/Idea.js";
import Setting from "../models/Setting.js";
import { mailEnabled } from "./mailer.js";
import { googleEnabled } from "../config/passport.js";
import { uploadsEnabled } from "./uploads.js";

export const ORDER_STEPS = ["paid", "printed", "shipped"];
const TZ = "America/Denver";

// "Sugar Skull Bloom — L · Black" -> { name: "Sugar Skull Bloom", details: "L · Black", custom: false }
export function splitItem(name) {
  const [base, ...rest] = String(name || "").split(" — ");
  const details = rest.join(" — ");
  return { name: base, details, custom: details.includes('"') };
}

// Monday of the week a date falls in (in Utah time), as yyyy-mm-dd
function weekStart(d) {
  const local = new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
  const day = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - day);
  return local.toISOString().slice(0, 10);
}

export async function dashboardData() {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const monthStart = new Date(local.getFullYear(), local.getMonth(), 1);
  const since = new Date(now.getTime() - 120 * 864e5);

  const toPrintQ = { $or: [{ status: "paid" }, { status: { $exists: false } }] };
  // The dashboard shows the 8 oldest open orders; the counts cover all of them
  const [orders, queue, toPrint, toShip, unread, latestMessages, ideas, productCount, newest, setupDone] = await Promise.all([
    Order.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).lean(),
    Order.find({ $or: [{ status: { $in: ["paid", "printed"] } }, { status: { $exists: false } }] }).sort({ createdAt: 1 }).limit(8).lean(),
    Order.countDocuments(toPrintQ),
    Order.countDocuments({ status: "printed" }),
    ContactMessage.countDocuments({ read: false }),
    ContactMessage.find().sort({ createdAt: -1 }).limit(3).lean(),
    Idea.find().sort({ order: 1 }).lean(),
    Product.countDocuments(),
    Product.find().sort({ createdAt: -1 }).limit(3).lean(),
    Setting.findOne({ key: "setup.done" }).lean(),
  ]);

  const thisMonth = orders.filter(o => o.createdAt >= monthStart);
  const shirtsIn = list => list.reduce((a, o) => a + (o.items || []).reduce((b, i) => b + (i.quantity || 0), 0), 0);

  // Weekly sales for the last 8 weeks (oldest first, empty weeks included)
  const weeks = [];
  for (let i = 7; i >= 0; i--) weeks.push({ start: weekStart(new Date(now.getTime() - i * 7 * 864e5)), sales: 0, orders: 0 });
  for (const o of orders) {
    const w = weeks.find(x => x.start === weekStart(o.createdAt));
    if (w) { w.sales += o.total || 0; w.orders += 1; }
  }

  // Top sellers in the last 120 days by shirts sold
  const sellers = new Map();
  for (const o of orders) for (const it of o.items || []) {
    const { name } = splitItem(it.name);
    const s = sellers.get(name) || { name, qty: 0, sales: 0 };
    s.qty += it.quantity || 0; s.sales += it.price || 0;
    sellers.set(name, s);
  }

  const done = setupDone?.value || {};
  const setup = [
    { key: "email", label: "Turn on email sign-in", ok: mailEnabled,
      how: "In the shop's Gmail: turn on 2-Step Verification, create an app password at myaccount.google.com/apppasswords, then add SMTP_USER (the Gmail address) and SMTP_PASS (the app password) in Render's Environment settings." },
    { key: "webhook", label: "Save paid orders automatically", ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      how: "In Render's Environment settings, add STRIPE_WEBHOOK_SECRET from Stripe (Developers, then Webhooks). Without it, paid orders don't show up here." },
    { key: "photos", label: "Upload shirt photos from the site", ok: uploadsEnabled(),
      how: "In Render's Environment settings, add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (us-east-2) and S3_BUCKET_NAME (venturecreations-images), the same ones the site's .env file has. Until then, paste photo links on the Add a shirt page." },
    { key: "google", label: "Google sign-in", ok: googleEnabled, how: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Render." },
    { key: "searchConsole", label: "Tell Google about the site", ok: Boolean(done.searchConsole), manual: true,
      how: "In Google Search Console (signed in to the shop's Gmail), add venturecreations.net and submit venturecreations.net/sitemap.xml." },
  ];

  return {
    month: { orders: thisMonth.length, sales: thisMonth.reduce((a, o) => a + (o.total || 0), 0), shirts: shirtsIn(thisMonth),
             name: local.toLocaleString("en-US", { month: "long" }) },
    toPrint, toShip, moreOpen: Math.max(0, toPrint + toShip - queue.length),
    queue: queue.map(o => ({ ...o, status: o.status || "paid", lines: (o.items || []).map(it => ({ ...it, ...splitItem(it.name) })) })),
    weeks,
    topSellers: [...sellers.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    unread, latestMessages,
    ideas: { total: ideas.length, byStatus: ideas.reduce((m, i) => (m[i.status] = (m[i.status] || 0) + 1, m), {}),
             next: ideas.filter(i => i.status === "Planned" || i.status === "In progress").slice(0, 3) },
    productCount, newest,
    setup: setup.filter(s => !s.ok),
    hour: local.getHours(),
  };
}
