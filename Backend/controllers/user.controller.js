import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloud.js";
import { sendOtpEmail } from "../utils/mailer.js";

// Generate a random 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* =========================================================
   REGISTER
========================================================= */

export const register = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phoneNumber,
      password,
      role,
      termsAcceptedAt,
    } = req.body;

    // Validate required fields
    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    // Check whether email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
        success: false,
      });
    }

    /* ---------------------------------------------------------
       CLOUDINARY PROFILE PHOTO
    --------------------------------------------------------- */

    const file = req.file;

    console.log("UPLOAD DEBUG:", {
      fileExists: !!file,
      fileName: file?.originalname || null,
      mimeType: file?.mimetype || null,
      fileSize: file?.size || null,
    });

    let cloudResponse = null;

    // Photo is optional
    if (file) {
      try {
        const fileUri = getDataUri(file);

        console.log("DATA URI DEBUG:", {
          hasContent: !!fileUri?.content,
          contentLength: fileUri?.content?.length || 0,
        });

        if (!fileUri?.content) {
          return res.status(400).json({
            message: "Unable to process uploaded image",
            success: false,
          });
        }

        cloudResponse = await cloudinary.uploader.upload(
          fileUri.content,
          {
            resource_type: "image",
          }
        );

        console.log(
          "CLOUDINARY SUCCESS:",
          cloudResponse?.secure_url
        );
      } catch (cloudError) {
        console.error("CLOUDINARY UPLOAD ERROR:", {
          message: cloudError?.message,
          http_code: cloudError?.http_code,
          name: cloudError?.name,
          error: cloudError?.error,
        });

        return res.status(500).json({
          message:
            "Profile photo upload failed. Please try again.",
          success: false,
        });
      }
    }

    /* ---------------------------------------------------------
       PASSWORD HASH
    --------------------------------------------------------- */

    const hashedPassword = await bcrypt.hash(password, 10);

    /* ---------------------------------------------------------
       OTP
    --------------------------------------------------------- */

    const otp = generateOtp();

    const otpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    /* ---------------------------------------------------------
       CREATE USER
    --------------------------------------------------------- */

    const newUser = new User({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      termsAcceptedAt,
      isVerified: false,

      otp,
      otpExpiry,

      profile: {
        profilePhoto:
          cloudResponse?.secure_url || "",
      },
    });

    await newUser.save();

    /* ---------------------------------------------------------
       SEND OTP EMAIL
    --------------------------------------------------------- */

    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error(
        "FAILED TO SEND OTP EMAIL:",
        mailError
      );

      // Remove account if email could not be sent
      await User.deleteOne({
        _id: newUser._id,
      });

      return res.status(500).json({
        message:
          "Could not send verification email. Please try again.",
        success: false,
      });
    }

    return res.status(200).json({
      message:
        "OTP sent to your email. Please verify to continue.",
      email,
      success: true,
    });
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      message: "Server Error registering user",
      success: false,
    });
  }
};

/* =========================================================
   VERIFY OTP
========================================================= */

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
        success: false,
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message:
          "Email is already verified. Please login.",
        success: false,
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
        success: false,
      });
    }

    if (
      !user.otpExpiry ||
      user.otpExpiry < new Date()
    ) {
      return res.status(400).json({
        message:
          "OTP has expired. Please request a new one.",
        success: false,
      });
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    /* ---------------------------------------------------------
       LOGIN USER AFTER VERIFICATION
    --------------------------------------------------------- */

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    const safeUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "Strict",
      })
      .json({
        message:
          "Email verified successfully.",
        user: safeUser,
        success: true,
      });
  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error verifying OTP",
      success: false,
    });
  }
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message:
          "No account found with this email",
        success: false,
      });
    }

    const otp = generateOtp();

    user.otp = otp;
    user.otpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    await sendOtpEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent to your email.",
      success: true,
    });
  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error sending OTP",
      success: false,
    });
  }
};

/* =========================================================
   RESET PASSWORD
========================================================= */

export const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
        success: false,
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
        success: false,
      });
    }

    if (
      !user.otpExpiry ||
      user.otpExpiry < new Date()
    ) {
      return res.status(400).json({
        message:
          "OTP has expired. Please request a new one.",
        success: false,
      });
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isVerified = true;

    await user.save();

    return res.status(200).json({
      message:
        "Password changed successfully. Please login.",
      success: true,
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error resetting password",
      success: false,
    });
  }
};

/* =========================================================
   RESEND OTP
========================================================= */

export const resendOtp = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message:
          "Email is already verified. Please login.",
        success: false,
      });
    }

    const otp = generateOtp();

    user.otp = otp;
    user.otpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    await sendOtpEmail(
      email,
      otp
    );

    return res.status(200).json({
      message:
        "A new OTP has been sent to your email.",
      success: true,
    });
  } catch (error) {
    console.error(
      "RESEND OTP ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error resending OTP",
      success: false,
    });
  }
};

/* =========================================================
   LOGIN
========================================================= */

export const login = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
      role,
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields",
        success: false,
      });
    }

    let user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        message:
          "Incorrect email or password",
        success: false,
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(401).json({
        message:
          "Incorrect email or password",
        success: false,
      });
    }

    // Email verification required
    if (!user.isVerified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in.",
        needVerification: true,
        success: false,
      });
    }

    // Check role
    if (user.role !== role) {
      return res.status(403).json({
        message:
          "You don't have the necessary role to access this resource",
        success: false,
      });
    }

    /* ---------------------------------------------------------
       JWT
    --------------------------------------------------------- */

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    const safeUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "Strict",
      })
      .json({
        message:
          `Welcome back ${user.fullname}`,
        user: safeUser,
        success: true,
      });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error login failed",
      success: false,
    });
  }
};

/* =========================================================
   LOGOUT
========================================================= */

export const logout = async (
  req,
  res
) => {
  try {
    return res
      .status(200)
      .cookie("token", "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: "Strict",
      })
      .json({
        message:
          "Logged out successfully.",
        success: true,
      });
  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error logging out",
      success: false,
    });
  }
};

/* =========================================================
   UPDATE PROFILE
========================================================= */

export const updateProfile = async (
  req,
  res
) => {
  try {
    console.log(
      "PROFILE UPDATE FILE:",
      req.file
    );

    console.log(
      "PROFILE UPDATE BODY:",
      req.body
    );

    const {
      fullname,
      email,
      phoneNumber,
      bio,
      skills,
      resume,
    } = req.body;

    const file = req.file;

    /* ---------------------------------------------------------
       AUTHENTICATED USER ID
    --------------------------------------------------------- */

    const userId = req.id;

    if (!userId) {
      return res.status(401).json({
        message:
          "Unauthorized request",
        success: false,
      });
    }

    /* ---------------------------------------------------------
       FIND USER
    --------------------------------------------------------- */

    let user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    /* ---------------------------------------------------------
       CLOUDINARY PROFILE PHOTO
    --------------------------------------------------------- */

    let cloudResponse = null;

    if (file) {
      try {
        const fileUri =
          getDataUri(file);

        if (!fileUri?.content) {
          return res.status(400).json({
            message:
              "Unable to process uploaded image",
            success: false,
          });
        }

        cloudResponse =
          await cloudinary.uploader.upload(
            fileUri.content,
            {
              resource_type: "image",
            }
          );

        console.log(
          "PROFILE PHOTO UPLOADED:",
          cloudResponse?.secure_url
        );
      } catch (cloudError) {
        console.error(
          "PROFILE CLOUDINARY ERROR:",
          {
            message:
              cloudError?.message,
            http_code:
              cloudError?.http_code,
            name:
              cloudError?.name,
            error:
              cloudError?.error,
          }
        );

        return res.status(500).json({
          message:
            "Profile photo upload failed",
          success: false,
        });
      }
    }

    /* ---------------------------------------------------------
       UPDATE BASIC INFORMATION
    --------------------------------------------------------- */

    if (fullname) {
      user.fullname = fullname;
    }

    if (email) {
      user.email = email;
    }

    if (phoneNumber) {
      user.phoneNumber =
        phoneNumber;
    }

    /* ---------------------------------------------------------
       UPDATE PROFILE
    --------------------------------------------------------- */

    if (bio !== undefined) {
      user.profile.bio = bio;
    }

    if (skills !== undefined) {
      const skillsArray =
        skills
          .split(",")
          .map((skill) =>
            skill.trim()
          )
          .filter(Boolean);

      user.profile.skills =
        skillsArray;
    }

    if (resume !== undefined) {
      user.profile.resume =
        resume;
    }

    /* ---------------------------------------------------------
       PROFILE PHOTO
    --------------------------------------------------------- */

    if (cloudResponse?.secure_url) {
      user.profile.profilePhoto =
        cloudResponse.secure_url;
    }

    /* ---------------------------------------------------------
       SAVE
    --------------------------------------------------------- */

    await user.save();

    /* ---------------------------------------------------------
       SAFE USER RESPONSE
    --------------------------------------------------------- */

    const safeUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber:
        user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res.status(200).json({
      message:
        "Profile updated successfully",
      user: safeUser,
      success: true,
    });
  } catch (error) {
    console.error(
      "UPDATE PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server Error updating profile",
      success: false,
    });
  }
};