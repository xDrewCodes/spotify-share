import fetch from "node-fetch";
import admin from "firebase-admin";

// Only initialize admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

export default async function handler(req, res) {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send("Missing Spotify code");
  }

  try {
    // Step 1: exchange code for tokens
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Spotify token exchange failed:", errorData);
      return res.status(500).json({ error: "Token exchange failed", details: errorData });
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: get Spotify profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok) {
      return res.status(500).json({ error: "Failed to fetch Spotify profile" });
    }

    const profile = await profileResponse.json();

    // Step 3: Create/update Firebase user (uid = spotify:profile.id)
    const uid = `spotify:${profile.id}`;
    await admin.auth().updateUser(uid, {
      displayName: profile.display_name || "Spotify User",
      email: profile.email || undefined,
      photoURL: profile.images?.[0]?.url || undefined,
    }).catch(async (err) => {
      if (err.code === "auth/user-not-found") {
        await admin.auth().createUser({
          uid,
          displayName: profile.display_name || "Spotify User",
          email: profile.email || undefined,
          photoURL: profile.images?.[0]?.url || undefined,
        });
      } else {
        throw err;
      }
    });

    // Step 4: Generate Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(uid);

    // Step 5: Redirect to our dynamic frontend callback
    return res.redirect(302, `/api/spotify-callback?firebaseToken=${firebaseToken}`);

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
