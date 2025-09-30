export default function handler(req, res) {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  res.setHeader("Content-Type", "text/html");
  res.send(`
<!DOCTYPE html>
<html>
  <body>
    <p>Signing you in...</p>
    <script type="module">
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
      import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

      const firebaseConfig = ${JSON.stringify(firebaseConfig)};
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);

      // read token from query string
      const params = new URLSearchParams(window.location.search);
      const firebaseToken = params.get("firebaseToken");

      if (!firebaseToken) {
        document.body.innerHTML = "<p>Missing Firebase token.</p>";
      } else {
        signInWithCustomToken(auth, firebaseToken)
          .then(() => {
            window.location.href = "/?loggedIn=true"; // redirect after login
          })
          .catch(err => {
            console.error("Firebase login failed", err);
            document.body.innerHTML = "<p>Login failed. Check console.</p>";
          });
      }
    </script>
  </body>
</html>
  `);
}
