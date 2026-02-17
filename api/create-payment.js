export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { order_id } = req.body;

  // Placeholder for now
  return res.status(200).json({
    payment_url: "https://example.com"
  });
}
