const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

export default async function handler(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (!state || !code) {
    return res.status(400).send('Missing code or state');
  }

  try {
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      }).toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Spotify token exchange failed:', errorData);
      return res.status(500).json({ error: 'Token exchange failed', details: errorData });
    }

    const data = await response.json();
    const { access_token, refresh_token } = data;

    console.log('Tokens:', { access_token, refresh_token });

    // ✅ Redirect to a frontend page that handles localStorage
    return res.redirect('/login-success.html'); // Or your desired page
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
