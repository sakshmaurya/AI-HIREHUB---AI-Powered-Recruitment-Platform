import nodemailer from "nodemailer";

const createTransporter = () => {
  if (
    !process.env.EMAIL_USER ||
    !process.env.CLIENT_ID ||
    !process.env.CLIENT_SECRET ||
    !process.env.REFRESH_TOKEN
  ) {
    throw new Error(
      "Gmail OAuth2 environment variables are missing"
    );
  }

  return nodemailer.createTransport({
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
};

export const sendOtpEmail = async (to, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Job Hunt" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email - Job Hunt",

    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, sans-serif;
        ">
          <div style="
            max-width: 600px;
            margin: 40px auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
          ">
            <h2 style="margin-top: 0;">
              Verify your email
            </h2>

            <p>
              Thank you for registering with Job Hunt.
            </p>

            <p>
              Use the following OTP to verify your email address:
            </p>

            <div style="
              margin: 25px 0;
              padding: 20px;
              background: #f3f4f6;
              border-radius: 8px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
            ">
              ${otp}
            </div>

            <p>
              This OTP will expire soon.
            </p>

            <p style="color: #666;">
              If you did not create this account, you can safely
              ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);

    console.log("✅ OTP EMAIL SENT:", {
      messageId: result.messageId,
      to,
    });

    return result;
  } catch (error) {
    console.error("❌ FAILED TO SEND OTP EMAIL:", error);
    throw error;
  }
};