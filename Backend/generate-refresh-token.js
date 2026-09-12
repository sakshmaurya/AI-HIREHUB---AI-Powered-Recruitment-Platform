import "dotenv/config";
import { google } from "googleapis";
import http from "http";
import { URL } from "url";

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ CLIENT_ID or CLIENT_SECRET is missing in .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// IMPORTANT:
// Nodemailer Gmail SMTP OAuth2 requires the mail.google.com scope.
const scopes = [
  "https://mail.google.com/",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes,
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const error = url.searchParams.get("error");

    if (error) {
      console.error("❌ Google authorization error:", error);

      res.writeHead(400, {
        "Content-Type": "text/html",
      });

      res.end(`
        <h2>Authorization failed</h2>
        <p>${error}</p>
      `);

      server.close();
      return;
    }

    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400);
      res.end("Authorization code not found");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error("❌ No refresh token received.");
      console.error(
        "Run the authorization again with prompt: consent."
      );

      res.writeHead(500);
      res.end("Refresh token was not received.");
      server.close();
      return;
    }

    console.log("\n=================================");
    console.log("✅ NEW REFRESH TOKEN GENERATED");
    console.log("=================================");
    console.log(tokens.refresh_token);
    console.log("=================================\n");

    console.log("⚠️ Copy this token to your .env file:");
    console.log("REFRESH_TOKEN=<new-token>");

    res.writeHead(200, {
      "Content-Type": "text/html",
    });

    res.end(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h2>✅ Authorization successful!</h2>
          <p>A new refresh token has been generated.</p>
          <p>You can close this browser tab and return to the terminal.</p>
        </body>
      </html>
    `);

    server.close();
  } catch (error) {
    console.error(
      "❌ OAuth error:",
      error.response?.data || error.message
    );

    res.writeHead(500, {
      "Content-Type": "text/html",
    });

    res.end(`
      <h2>Authorization failed</h2>
      <p>Check the terminal for the error.</p>
    `);

    server.close();
  }
});

server.listen(PORT, () => {
  console.log("=================================");
  console.log("Google OAuth2 Authorization");
  console.log("=================================");
  console.log(`Callback: ${REDIRECT_URI}`);
  console.log("\nOpen this URL in your browser:\n");
  console.log(authUrl);
  console.log("\nWaiting for Google authorization...\n");
});