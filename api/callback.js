// api/callback.js
import axios from 'axios';

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
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(client_id + ':' + client_secret).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    res.status(200).json({ access_token, refresh_token });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Failed to exchange token');
  }
}
