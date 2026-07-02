const express = require("express");
const { MessageController } = require("../controllers");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/:roomId", authMiddleware, MessageController.GetMessages);
router.post("/", authMiddleware, MessageController.CreateMessage);

module.exports = router;
