import querystring from "querystring";
import fetch from "node-fetch";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

export default async function handler(req, res) {
  const { code } = req.query; // Spotify returns this after redirect

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
      body: querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    // 2. Get Spotify user profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    // 3. Create Firebase custom token
    const firebaseToken = await admin
      .auth()
      .createCustomToken(profile.id, { provider: "spotify" });

    res.status(200).json({ firebaseToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Auth failed" });
  }
}
