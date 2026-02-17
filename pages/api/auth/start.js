import crypto from "crypto";

export default async function handler(req, res) {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop");

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;

  // Store state in a short-lived cookie
  res.setHeader("Set-Cookie", `shopify_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);

  const scopes = process.env.SHOPIFY_SCOPES;
  const authUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return res.redirect(authUrl);
}
