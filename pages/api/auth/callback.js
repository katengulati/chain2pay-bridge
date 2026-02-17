  import crypto from "crypto";

function getCookie(req, name) {
  const match = (req.headers.cookie || "").match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export default async function handler(req, res) {
  const { shop, code, state } = req.query;
  if (!shop || !code || !state) return res.status(400).send("Missing params");

  const expectedState = getCookie(req, "shopify_oauth_state");
  if (!expectedState || expectedState !== state) return res.status(400).send("Invalid state");

  // Exchange code -> access token
  const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    return res.status(500).send(`Token exchange failed: ${JSON.stringify(tokenData)}`);
  }

  // Store token in a cookie for now (simple). Better is Redis/DB.
  res.setHeader(
    "Set-Cookie",
    `shopify_access_token=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
  );

  // Redirect back to your pay page (if you passed order_id through, keep it)
  const returnTo = req.query.return_to || "/";
  return res.redirect(returnTo);
}
