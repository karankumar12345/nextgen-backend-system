const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
const routes = require("./routes/index");
const globalErrorHandler = require("./utils/globalerror");

app.use(
  cors({
    origin: ["http://localhost:5173"], // Vite frontend
    credentials: true,                 // allow cookies/auth headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1", routes);
app.use(globalErrorHandler);

module.exports = app;