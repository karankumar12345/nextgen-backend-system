const express = require("express");
const { CodeSnapshotController } = require("../controllers");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/:roomId", authMiddleware, CodeSnapshotController.GetSnapshot);
router.post("/", authMiddleware, CodeSnapshotController.SaveSnapshot);

module.exports = router;
