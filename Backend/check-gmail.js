import "dotenv/config";

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("CLIENT_ID_SET:", !!process.env.CLIENT_ID);
console.log("CLIENT_SECRET_SET:", !!process.env.CLIENT_SECRET);
console.log("REFRESH_TOKEN_SET:", !!process.env.REFRESH_TOKEN);
