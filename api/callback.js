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

    console.log('Spotify tokens:', { access_token, refresh_token });

    localStorage.setItem('loggedIn', true)

    res.writeHead(302, {
      Location: '/',
    });
    res.end();

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
