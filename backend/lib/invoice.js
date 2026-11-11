// Receipts and invoices: the "order received" email and the printable invoice page.
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import Order from "../models/Order.js";
import { sendMail, mailEnabled, shopAddress } from "./mailer.js";
import { splitItem } from "./dashboard.js";
import { orderLabel } from "./orders.js";

const VIEWS = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/views");
const siteBase = () => (process.env.CLIENT_URL || "https://venturecreations.net").replace(/\/$/, "");

// A link key so a customer can open their own invoice from the email without signing in
export const invoiceKey = order => crypto.createHmac("sha256", process.env.SESSION_SECRET || "vc")
  .update(`invoice|${order._id}`).digest("base64url").slice(0, 24);
export const invoiceUrl = order => `${siteBase()}/invoice/${order._id}?k=${invoiceKey(order)}`;
export const keyMatches = (order, k) => {
  const a = Buffer.from(invoiceKey(order)), b = Buffer.from(String(k || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Everything the receipt email and invoice page show
export function invoiceData(order) {
  const lines = (order.items || []).map(it => ({ ...it, ...splitItem(it.name) }));
  const itemsTotal = lines.reduce((a, l) => a + (l.price || 0), 0);
  return {
    order, lines, label: orderLabel(order),
    date: new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" }),
    subtotal: order.subtotal ?? itemsTotal, discount: order.discount || 0, shipping: order.shipping || 0, tax: order.tax || 0, total: order.total || 0,
    addr: order.shippingAddress || {}, url: invoiceUrl(order), site: siteBase(), shop: shopAddress(),
  };
}

const money = n => "$" + Number(n || 0).toFixed(2);

export async function sendReceipt(order, { again = false } = {}) {
  if (!mailEnabled) throw new Error("Email isn't set up");
  if (!order.email) throw new Error("No customer email on this order");
  const d = invoiceData(order);
  const html = await ejs.renderFile(path.join(VIEWS, "email/receipt.ejs"), { ...d, money });
  const text = [
    order.source === "manual" ? `Invoice ${d.label} (${d.date})` : `Thank you for your order! (${d.label}, ${d.date})`, "",
    ...d.lines.map(l => `${l.quantity} x ${l.name}${l.details ? " (" + l.details + ")" : ""}  ${money(l.price)}`), "",
    `Subtotal ${money(d.subtotal)}`, d.discount ? `Group discount -${money(d.discount)}` : "", `Shipping ${money(d.shipping)}`, `Tax ${money(d.tax)}`, `${order.paid === false ? "Amount due" : "Total"} ${money(d.total)}`, order.notes ? `Note: ${order.notes}` : "", "",
    `Shipping to: ${[d.addr.name, d.addr.line1, d.addr.line2, [d.addr.city, d.addr.state, d.addr.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ")}`, "",
    `View or print your invoice: ${d.url}`, "",
    "Each shirt is made to order. We'll email you again with tracking when it ships. Questions? Just reply to this email.",
  ].filter(x => x !== "").join("\n");
  await sendMail({ to: order.email, bcc: again ? undefined : shopAddress() || undefined,
    subject: order.source === "manual" ? `Invoice ${d.label} from Venture Creations` : `${again ? "Your receipt" : "Order received"}: ${d.label}, Venture Creations`, text, html });
  await Order.updateOne({ _id: order._id }, { receiptSentAt: new Date() });
}
