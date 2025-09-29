const admin = require("firebase-admin");

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

export default async function handler(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (!state || !code) {
    return res.status(400).send("Missing code or state");
  }

  try {
    // Exchange code for Spotify tokens
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`,
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

    // Get Spotify profile info
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return res.status(500).json({ error: "Failed to fetch Spotify profile" });
    }

    const profile = await profileRes.json();

    // Use Spotify ID as Firebase UID
    const uid = `spotify:${profile.id}`;

    // Create/update Firebase user
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

    // Create a custom Firebase token
    const firebaseToken = await admin.auth().createCustomToken(uid);

    // Send it back to client (front-end can use signInWithCustomToken)
    return res.json({ firebaseToken, access_token, refresh_token });

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
