// Shipping carriers and tracking links for shipped orders
export const CARRIERS = {
  usps: { name: "USPS", url: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  ups: { name: "UPS", url: n => `https://www.ups.com/track?tracknum=${n}` },
  fedex: { name: "FedEx", url: n => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
};

// Guess the carrier from the number's shape when she doesn't pick one
export function guessCarrier(num) {
  if (/^1Z[0-9A-Z]{16}$/.test(num)) return "ups";
  if (/^(9[2-5]\d{18,24}|[A-Z]{2}\d{9}US)$/.test(num)) return "usps";
  if (/^(\d{12}|\d{15}|\d{20})$/.test(num)) return "fedex";
  return "usps";
}

// "9400 1000 0000 0000 0000 00" -> "9400100000000000000000"
export const cleanTracking = s => String(s || "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 40);

export function trackingFor(order) {
  if (!order?.trackingNumber) return null;
  const c = CARRIERS[order.carrier] || CARRIERS[guessCarrier(order.trackingNumber)];
  return { number: order.trackingNumber, carrier: c.name, url: c.url(encodeURIComponent(order.trackingNumber)) };
}
