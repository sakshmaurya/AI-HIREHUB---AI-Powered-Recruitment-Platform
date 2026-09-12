import "dotenv/config";
import nodemailer from "nodemailer";

try {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });

  await transporter.verify();

  console.log("=================================");
  console.log("✅ GMAIL SMTP AUTH OK");
  console.log("=================================");
} catch (error) {
  console.error("=================================");
  console.error("❌ GMAIL SMTP ERROR");
  console.error("=================================");
  console.error(error.message);
}