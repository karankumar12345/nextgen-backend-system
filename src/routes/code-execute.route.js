const express = require("express");
const { CodeExecuteController } = require("../controllers");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/execute", authMiddleware, CodeExecuteController.Execute);

module.exports = router;
