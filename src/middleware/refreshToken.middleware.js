const jwt = require("jsonwebtoken");
const { Session } = require("../models");

const verifyRefreshToken = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing",
    });
  }

  const session = await Session.findOne({
    where: {
      refresh_token: refreshToken,
      is_revoked: false,
    },
  });

  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Invalid session",
    });
  }

  try {
    req.user = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    req.session = session;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

module.exports = verifyRefreshToken;