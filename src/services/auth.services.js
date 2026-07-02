const { User, Session } = require("../models");
const AppError = require("../utils/AppError");
const { hash, verify } = require("@node-rs/argon2");
const jwt = require("jsonwebtoken");
const ejs = require("ejs");
const STATUS_CODES = require("../utils/statusCode");
const { uploadImage } = require("../utils/cloudinaryUtil");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");
const setRefreshTokenCookie = require("../utils/setAuthCookies");
const { CreateActivationToken } = require("../utils/ActivationToken");
const path = require("path");
const sendEmail = require("../utils/SendMail");

class AuthService {
RegisterUser = async function ({ userData, profile_pic }) {
  try {
  

    const {
      username,
      email,
      password,
      full_name,
      role_id = 2,
    } = userData;

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      throw new AppError(
        "Email already in use",
        STATUS_CODES.BAD_REQUEST
      );
    }

    const existingUsername = await User.findOne({
      where: { username },
    });

    if (existingUsername) {
  
      throw new AppError(
        "Username already in use",
        STATUS_CODES.BAD_REQUEST
      );
    }


    userData.password = await hash(password);
  
    if (profile_pic) {

      const uploadedFile = await uploadImage(
        profile_pic.buffer,
        `profile_${Date.now()}`
      );
      userData.profile_pic = uploadedFile.url;
   
    }


    const { activationCode, token } =
      CreateActivationToken(userData);


    const data = {
      user: userData,
      token,
      activationCode,
      year: new Date().getFullYear(),
    };


    await sendEmail({
      email: userData.email,
      subject: "Activate Your Account",
      template: "ActivateUser.ejs",
      data,
    });


    return {
      email: userData.email,
      token,
      activationCode,
    };
  } catch (error) {
    console.error(
      "========== REGISTRATION ERROR =========="
    );
    console.error(error);
    console.error(
      "========================================\n"
    );
    throw error;
  }
};

ActivateUser = async function ({ activation_token, activation_code }) {

  try {

    // Validate input
    if (!activation_token || !activation_code) {
      throw new AppError(
        "Activation token and code are required",
        STATUS_CODES.BAD_REQUEST
      );
    }

    let decoded;

    // Verify JWT token
    try {
     
      decoded = jwt.verify(
        activation_token,
        process.env.ACTIVATION_TOKEN_SECRET
      );
  
    } catch (error) {
      console.error("JWT verification failed:", error.message);
      throw new AppError(
        "Invalid or expired activation token",
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Extract payload
    const { user, activationCode } = decoded;


    // Validate decoded payload
    if (!user) {
      throw new AppError(
        "Invalid activation token payload: user data missing",
        STATUS_CODES.BAD_REQUEST
      );
    }

    if (!user.email) {
      throw new AppError(
        "Invalid activation token payload: email missing",
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Verify activation code
    if (String(activationCode) !== String(activation_code)) {
      console.error("Activation code mismatch");
      throw new AppError(
        "Invalid activation code",
        STATUS_CODES.BAD_REQUEST
      );
    }

  
    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: user.email },
    });

    if (existingUser) {
      if (existingUser.is_active) {
        throw new AppError(
          "Account already activated",
          STATUS_CODES.BAD_REQUEST
        );
      }

      // Optional: activate existing inactive user
      await existingUser.update({
        is_active: true,
        is_verified: true,
      });


      return existingUser;
    }

    // Create new user
    const userPayload = {
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      password: user.password, // already hashed
      role_id: Number(user.role_id) || 2,
      profile_pic: user.profile_pic || null,
      is_active: true,
      is_verified: true,
    };



    const newUser = await User.create(userPayload);

    return { user: newUser };
  } catch (error) {
    console.error("========== ACTIVATION ERROR ==========");
    console.error(error);
    console.error("======================================\n");
    throw error;
  }
};

  LoginUser = async function (req, res, loginData) {
    const { email, password } = loginData;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError(
        "Invalid email or password",
        STATUS_CODES.UNAUTHORIZED,
      );
    }
    const isPasswordValid = await verify(user.password, password);
    if (!isPasswordValid) {
      const failedAttempts = user.failed_login_attempts + 1;
      let lockoutTime = null;
      let lockoutCount = user.lockout_count || 0;
      if (failedAttempts >= 5) {
        lockoutTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
        lockoutCount += 1;
      }
      await user.update({
        failed_login_attempts: failedAttempts,
        locked_until: lockoutTime,
        lockout_count: lockoutCount,
      });
      throw new AppError(
        failedAttempts >= 5
          ? `Account locked due to multiple failed attempts. Try again after ${lockoutTime.toLocaleString()}`
          : `Invalid email or password. ${5 - failedAttempts} attempts remaining.`,
        STATUS_CODES.UNAUTHORIZED,
      );
    }
    await user.update({
      failed_login_attempts: 0,
      locked_until: null,
    });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const existingSession = await Session.findOne({
      where: {
        user_id: user.id,
        ip_address: req.ip,
        device_info: req.headers["sec-ch-ua-platform"] || "Unknown Device",
        is_revoked: false,
      },
    });

    if (existingSession) {
      await existingSession.update({
        refresh_token: refreshToken,
        last_used_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } else {
      await Session.create({
        user_id: user.id,
        refresh_token: refreshToken,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        device_info: req.headers["sec-ch-ua-platform"] || "Unknown Device",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_revoked: false,
        last_used_at: new Date(),
      });
    }
    setRefreshTokenCookie(res, refreshToken);
    return {
      token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        profile_pic: user.profile_pic,
        is_active: user.is_active,
        is_verified: user.is_verified,
      },
    };
  };
  RefreshAccessToken = async function (req, res) {
    const session = await Session.findOne({
      where: {
        refresh_token: req.cookies.refreshToken,
      },
    });

    if (!session || session.is_revoked) {
      throw new AppError("Session invalid, login again", 401);
    }

    const decoded = jwt.verify(
      req.cookies.refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET
    );
    await session.update({
      last_used_at: new Date(),
    });

    const accessToken = generateAccessToken(decoded);
    const user = await User.findByPk(decoded.id, {
      attributes: [
        "id",
        "username",
        "email",
        "full_name",
        "profile_pic",
        "role_id",
        "is_active",
        "is_verified",
      ],
    });

    return { token: accessToken, user };
  };

  LogoutUser = async function (req, res) {
    const refreshToken = req.cookies.refreshToken;
    await Session.update(
      { is_revoked: true },
      { where: { refresh_token: refreshToken } },
    );
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
  };

  LogoutFromAllDevices = async function (userId, res) {
    await Session.update({ is_revoked: true }, { where: { user_id: userId } });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
  };
  LogoutFromSelectedDevices = async function (sessionid, res) {
    await Session.update({ is_revoked: true }, { where: { id: sessionid } });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
  };

  GetProfile = async function (userId) {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "full_name",
        "profile_pic",
        "role_id",
        "is_active",
        "is_verified",
      ],
    });
    if (!user) {
      throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
    }
    return user;
  };
  UpdateProfile = async function (userId, updateData, profile_pic) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
    }
    if (profile_pic) {
      const uploadedFile = await uploadImage(
        profile_pic.buffer,
        `profile_${Date.now()}`
      );
      updateData.profile_pic = uploadedFile.url;
    }
    await user.update(updateData);
    return user;
  };
  ChangePassword = async function (userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
    }
    const isPasswordValid = await verify(user.password, currentPassword);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", STATUS_CODES.UNAUTHORIZED);
    }
    const hashedPassword = await hash(newPassword);
    await user.update({ password: hashedPassword });
    return user;
  };

  GetActiveSessions = async function (userId) {
    const sessions = await Session.findAll({
      where: {
        user_id: userId,
        is_revoked: false,
      },
      attributes: [
        "id",
        "ip_address",
        "device_info",
        "last_used_at",
        "expires_at",
      ],
    });
    return sessions;
  };
  GetAllUsers = async function () {
    const users = await User.findAll({
      attributes: [
        "id",
        "username",
        "email",
        "full_name",
        "profile_pic",
        "role_id",
        "is_active",
        "is_verified",
      ],
    });
    return users;
  };
  DeleteUser = async function (userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
    }
    await user.destroy();
  };
}

module.exports = new AuthService();
