

const express = require('express');
const validate = require('../utils/validate');
const { AuthValidation } = require('../validation');
const upload = require('../middleware/multerMiddleware');
const verifyRefreshToken = require('../middleware/refreshToken.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { AuthController } = require('../controllers');
const router = express.Router();

router.post('/register',upload,validate(AuthValidation.registerSchema), AuthController.RegisterUser);
router.post("/activate-user", AuthController.ActivateUser);

router.post(
  "/login",
  validate(AuthValidation.loginSchema),
  AuthController.LoginUser
);

router.post(
  "/refresh-token",
  verifyRefreshToken,
  AuthController.RefreshAccessToken
);
router.post(
  "/logout",
  verifyRefreshToken,
  AuthController.LogoutUser
);
router.post(
  "/logout-all",
  authMiddleware,
  AuthController.LogoutFromAllDevices
);

router.get(
  "/profile",
  authMiddleware,
  AuthController.GetProfile
);

router.put(
  "/profile",
  authMiddleware,
  upload,
  AuthController.UpdateProfile
);

router.put(
  "/change-password",
  authMiddleware,
  validate(AuthValidation.changePasswordSchema),
  AuthController.ChangePassword
);

router.get(
  "/sessions",
  authMiddleware,
  AuthController.GetActiveSessions
);

router.get(
  "/users",
  authMiddleware,
  AuthController.GetAllUsers
);


module.exports = router;