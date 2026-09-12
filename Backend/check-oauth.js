import "dotenv/config";
import { google } from "googleapis";

try {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "http://localhost:3000/oauth2callback"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  const { token } = await oauth2Client.getAccessToken();

  console.log("ACCESS_TOKEN_OK:", !!token);
} catch (error) {
  console.error("OAUTH_ERROR:", error.message);
}
