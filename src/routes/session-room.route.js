const express = require("express");
const { SessionRoomController } = require("../controllers");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/start", authMiddleware, SessionRoomController.StartSession);
router.post("/end", authMiddleware, SessionRoomController.EndSession);
router.get("/:roomId", authMiddleware, SessionRoomController.GetSession);

module.exports = router;
