module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected to whiteboard: " + socket.id);
    socket.on("disconnect", () => {
      console.log("User disconnected from whiteboard: " + socket.id);
    });
  });
};
