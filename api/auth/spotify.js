import fetch from "node-fetch";
import admin from "firebase-admin";

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    ),
  });
}

export default async function handler(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (!state || !code) {
    return res.status(400).send("Missing code or state");
  }

  try {
    // 1. Exchange code for access token
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Spotify token exchange failed:", errorData);
      return res.status(500).json({ error: "Token exchange failed", details: errorData });
    }

    const data = await response.json();
    const { access_token, refresh_token } = data;

    // 2. Get Spotify user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = await profileRes.json();

    if (!profile.id) {
      return res.status(500).json({ error: "Failed to fetch Spotify profile" });
    }

    // 3. Create Firebase custom token
    const firebaseToken = await admin
      .auth()
      .createCustomToken(profile.id, { provider: "spotify" });

    // 4. Return Firebase token + Spotify tokens to frontend
    return res.status(200).json({
      firebaseToken,
      spotifyAccessToken: access_token,
      spotifyRefreshToken: refresh_token,
      spotifyProfile: profile,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
