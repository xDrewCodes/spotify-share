// api/login.js
const querystring = require('querystring');

prompt('login hit')

const client_id = process.env.SPOTIFY_CLIENT_ID;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export default function handler(req, res) {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email';

  const query = querystring.stringify({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri,
    state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${query}`);
}
