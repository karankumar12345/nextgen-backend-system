const asyncHandler = require("../utils/asyncHandler");
const { User, Session } = require("../models");
const AppError = require("../utils/AppError");
const { argon2id, verify } = require("@node-rs/argon2");

const STATUS_CODES = require("../utils/statusCode");
const { uploadImage } = require("../utils/cloudinaryUtil");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");
const setRefreshTokenCookie = require("../utils/setAuthCookies");
const { where } = require("sequelize");
class AuthService {
  RegisterUser = asyncHandler(async function ({ userData, profile_pic }) {
    const { username, email, password, full_name, role_id } = userData;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError("Email already in use", STATUS_CODES.BAD_REQUEST);
    }
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      throw new AppError("Username already in use", STATUS_CODES.BAD_REQUEST);
    }
    const hashedPassword = await argon2id.hash(password);

    if (profile_pic) {
      const uploadedFile = await uploadImage(
        profile_pic.buffer,
        `profile_${Date.now()}`,
      );
      userData.profile_pic = uploadedFile.url;
    }

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      full_name,
      role_id,
      profile_pic: userData.profile_pic || null,
      is_active: true,
      is_verified: false,
    });
    return user;
  });

  LoginUser = asyncHandler(async function (req, res, loginData) {
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
    return { user, accessToken, refreshToken };
  });
  RefreshAccessToken = asyncHandler(async function (req, res) {
    const session = await Session.findOne({
      where: {
        refresh_token: req.cookies.refreshToken,
      },
    });

    if (!session || session.is_revoked) {
      throw new AppError("Session invalid, login again", 401);
    }

    await session.update({
      last_used_at: new Date(),
    });

    const accessToken = generateAccessToken({ id: session.user_id });

    return { accessToken };
  });

  LogoutUser = asyncHandler(async function (req) {
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
  });

  LogoutFromAllDevices = asyncHandler(async function (userId, res) {
    await Session.update({ is_revoked: true }, { where: { user_id: userId } });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
  });

  GetProfile = asyncHandler(async function (userId) {
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
  });
  UpdateProfile = asyncHandler(
    async function (userId, updateData, profile_pic) {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
      }
      await user.update(updateData);
      if (profile_pic) {
        await user.update({ profile_pic });
      }
      return user;
    },
  );
  ChangePassword = asyncHandler(async function (userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
    }
    const isPasswordValid = await verify(user.password, currentPassword);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", STATUS_CODES.UNAUTHORIZED);
    }
    const hashedPassword = await argon2id.hash(newPassword);
    await user.update({ password: hashedPassword });
    return user;
  });

  GetActiveSessions = asyncHandler(async function (userId) {
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
  });
  GetAllUsers = asyncHandler(async function () {
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
  });
}

module.exports = new AuthService();
