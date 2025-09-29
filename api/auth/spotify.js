const admin = require("firebase-admin");
const fetch = require("node-fetch");

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (err) {
  console.error("Invalid or missing FIREBASE_SERVICE_ACCOUNT_KEY", err);
  throw err;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = async function handler(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  try {
    // 1. Exchange Spotify code for tokens
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      console.error("Spotify token exchange failed:", errData);
      return res.status(500).json({ error: "Token exchange failed", details: errData });
    }

    const { access_token, refresh_token } = await tokenRes.json();

    // 2. Get Spotify profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await profileRes.json();

    const uid = `spotify:${profile.id}`;

    // 3. Create/update Firebase user
    await admin.auth().updateUser(uid, {
      displayName: profile.display_name,
      email: profile.email || undefined,
      photoURL: profile.images?.[0]?.url || undefined,
    }).catch(async (err) => {
      if (err.code === "auth/user-not-found") {
        await admin.auth().createUser({
          uid,
          displayName: profile.display_name,
          email: profile.email || undefined,
          photoURL: profile.images?.[0]?.url || undefined,
        });
      } else {
        throw err;
      }
    });

    // 4. Create Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(uid);

    // 5. Redirect to frontend callback page
    const redirectUrl = `/spotify-callback?firebaseToken=${firebaseToken}`;
    return res.redirect(302, redirectUrl);

  } catch (err) {
    console.error("Unexpected error in Spotify callback:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
