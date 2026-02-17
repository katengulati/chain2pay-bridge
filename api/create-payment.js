function getCookie(req, name) {
  const match = (req.headers.cookie || "").match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { order_id, shop } = req.body;
  if (!order_id || !shop) return res.status(400).json({ error: "Missing order_id or shop" });

  const token = getCookie(req, "shopify_access_token");
  if (!token) {
    // send them into OAuth then back to pay page
    const returnTo = `${process.env.APP_URL}/pay?order_id=${encodeURIComponent(order_id)}&shop=${encodeURIComponent(shop)}`;
    return res.status(401).json({ auth_url: `/api/auth/start?shop=${encodeURIComponent(shop)}&return_to=${encodeURIComponent(returnTo)}` });
  }

  // 1) Fetch Shopify order
  const orderResp = await fetch(`https://${shop}/admin/api/2024-01/orders/${order_id}.json`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  const orderData = await orderResp.json();
  if (!orderData.order) return res.status(500).json({ error: "Failed to fetch order", details: orderData });

  const order = orderData.order;
  const amount = parseFloat(order.current_total_price);
  const email = order.email || order.customer?.email || "";

  // 2) Create Chain2Pay payment link
  const c2pResp = await fetch("https://chain2pay.cloud/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      currency: "USD",
      merchant_wallet: process.env.CHAIN2PAY_WALLET,
      callback_url: process.env.CHAIN2PAY_CALLBACK_URL,
      customer_email: email,
    }),
  });

  const c2p = await c2pResp.json();
  if (!c2p.payment_url) return res.status(500).json({ error: "Chain2Pay failed", details: c2p });

  return res.status(200).json({ payment_url: c2p.payment_url });
}
