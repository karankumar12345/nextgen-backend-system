const app = require("./app");
const { sequelize } = require("./models/index"); // models/index.js
const { Server } = require("socket.io");
const http = require("http");
require("dotenv").config();
const registerSocket = require("./socket/index"); // socket/index.js

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
    const PORT = process.env.PORT || 3000;
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      },
    });
  registerSocket(io);
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

startServer();
