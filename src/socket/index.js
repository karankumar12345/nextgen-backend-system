const jwt = require("jsonwebtoken");
const { User, Room, Message } = require("../models");

const roomParticipants = new Map();
const roomWhiteboards = new Map();
const pendingJoinRequests = new Map();
const approvedUsers = new Map();

function getApprovedSet(roomId) {
  if (!approvedUsers.has(roomId)) {
    approvedUsers.set(roomId, new Set());
  }
  return approvedUsers.get(roomId);
}

function getPendingMap(roomId) {
  if (!pendingJoinRequests.has(roomId)) {
    pendingJoinRequests.set(roomId, new Map());
  }
  return pendingJoinRequests.get(roomId);
}

function notifyHostOfJoinRequest(io, roomId, requester) {
  const participants = roomParticipants.get(roomId);
  if (!participants) return;

  participants.forEach((participant) => {
    if (participant.isHost) {
      io.to(participant.socketId).emit("join_request", {
        roomId,
        user: {
          id: requester.id,
          name: requester.name,
          username: requester.username,
          profile_pic: requester.profile_pic,
        },
      });
    }
  });
}

async function completeRoomJoin(socket, io, roomId, room, user) {
  socket.join(roomId);
  socket.currentRoomId = roomId;

  if (!roomParticipants.has(roomId)) {
    roomParticipants.set(roomId, new Map());
  }
  if (!roomWhiteboards.has(roomId)) {
    roomWhiteboards.set(roomId, []);
  }

  const isHost = room.created_by === user.id;
  const participant = {
    ...socket.userData,
    socketId: socket.id,
    isHost,
  };

  roomParticipants.get(roomId).set(socket.id, participant);

  socket.to(roomId).emit("user_joined", { user: participant });
  broadcastParticipants(io, roomId);

  socket.emit("join_approved", { roomId });
  socket.emit("whiteboard_state", {
    actions: roomWhiteboards.get(roomId) || [],
  });

  if (isHost) {
    const pending = getPendingMap(roomId);
    pending.forEach((requester) => {
      socket.emit("join_request", {
        roomId,
        user: {
          id: requester.user.id,
          name: requester.user.name,
          username: requester.user.username,
          profile_pic: requester.user.profile_pic,
        },
      });
    });
  }
}

function getParticipantsList(roomId) {
  const participants = roomParticipants.get(roomId);
  if (!participants) return [];
  return Array.from(participants.values());
}

function broadcastParticipants(io, roomId) {
  io.to(roomId).emit("participants_list", {
    participants: getParticipantsList(roomId),
  });
}

function updateParticipant(roomId, socketId, updates) {
  const participants = roomParticipants.get(roomId);
  const participant = participants?.get(socketId);
  if (!participant) return null;
  Object.assign(participant, updates);
  return participant;
}

function removeParticipant(socket, io) {
  const rooms = socket.rooms;
  rooms.forEach((roomId) => {
    if (roomId === socket.id) return;

    const participants = roomParticipants.get(roomId);
    if (!participants) return;

    const participant = participants.get(socket.id);
    if (participant) {
      participants.delete(socket.id);
      if (participants.size === 0) {
        roomParticipants.delete(roomId);
      }
      socket.to(roomId).emit("user_left", { user: participant });
      broadcastParticipants(io, roomId);
    }
  });
}

const registerSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
      );
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    try {
      const user = await User.findByPk(socket.userId, {
        attributes: ["id", "username", "full_name", "profile_pic"],
      });

      if (!user) {
        socket.disconnect();
        return;
      }

      socket.userData = {
        id: user.id,
        name: user.full_name || user.username,
        username: user.username,
        profile_pic: user.profile_pic,
        isOnline: true,
        isSpeaking: false,
        isHandRaised: false,
        isMicMuted: true,
        isCameraOff: true,
      };

      console.log(`User connected: ${socket.userData.name} (${socket.id})`);

      socket.on("join_room", async ({ roomId }) => {
        if (!roomId) return;

        const room = await Room.findOne({ where: { room_id: roomId } });
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const isHost = room.created_by === user.id;
        const isApproved = getApprovedSet(roomId).has(user.id);

        if (room.is_private && !isHost && !isApproved) {
          const pending = getPendingMap(roomId);
          pending.set(user.id, {
            socketId: socket.id,
            user: socket.userData,
          });

          socket.emit("join_pending", {
            roomId,
            message: "Waiting for host approval to enter this private room",
          });

          notifyHostOfJoinRequest(io, roomId, socket.userData);
          return;
        }

        await completeRoomJoin(socket, io, roomId, room, user);
      });

      socket.on("approve_join", async ({ roomId, userId }) => {
        if (!roomId || !userId) return;

        const room = await Room.findOne({ where: { room_id: roomId } });
        if (!room || room.created_by !== user.id) {
          socket.emit("error", { message: "Only the host can approve join requests" });
          return;
        }

        getApprovedSet(roomId).add(userId);

        const pending = getPendingMap(roomId).get(userId);
        if (pending) {
          const guestSocket = io.sockets.sockets.get(pending.socketId);
          if (guestSocket) {
            await completeRoomJoin(guestSocket, io, roomId, room, { id: userId });
          } else {
            io.to(pending.socketId).emit("join_approved", { roomId });
          }
          getPendingMap(roomId).delete(userId);
        }
      });

      socket.on("deny_join", async ({ roomId, userId }) => {
        if (!roomId || !userId) return;

        const room = await Room.findOne({ where: { room_id: roomId } });
        if (!room || room.created_by !== user.id) {
          socket.emit("error", { message: "Only the host can deny join requests" });
          return;
        }

        const pending = getPendingMap(roomId).get(userId);
        if (pending) {
          io.to(pending.socketId).emit("join_denied", {
            roomId,
            message: "The host denied your request to join this private room",
          });
          getPendingMap(roomId).delete(userId);
        }
      });

      socket.on("leave_room", ({ roomId }) => {
        const targetRoom = roomId || socket.currentRoomId;
        if (!targetRoom) return;

        const participants = roomParticipants.get(targetRoom);
        const participant = participants?.get(socket.id);

        socket.leave(targetRoom);
        socket.currentRoomId = null;

        if (participant && participants) {
          participants.delete(socket.id);
          if (participants.size === 0) {
            roomParticipants.delete(targetRoom);
          }
          socket.to(targetRoom).emit("user_left", { user: participant });
          broadcastParticipants(io, targetRoom);
        }
      });

      socket.on("send_message", async ({ roomId, message }) => {
        if (!roomId || !message?.trim()) return;

        const room = await Room.findOne({ where: { room_id: roomId } });
        if (!room) return;

        if (room.is_private && room.created_by !== user.id) {
          const approved = getApprovedSet(roomId).has(user.id);
          if (!approved) {
            socket.emit("error", { message: "You do not have access to this private room" });
            return;
          }
        }

        try {
          const savedMessage = await Message.create({
            room_id: roomId,
            sender: user.id,
            message: message.trim(),
          });

          const fullMessage = await Message.findByPk(savedMessage.id, {
            include: [
              {
                model: User,
                as: "sender_user",
                attributes: ["id", "full_name", "username", "profile_pic"],
              },
            ],
          });

          io.to(roomId).emit("receive_message", { message: fullMessage });
        } catch (err) {
          console.error("send_message error:", err);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      socket.on("code_change", ({ roomId, code, language }) => {
        if (!roomId) return;
        socket.to(roomId).emit("code_change", {
          roomId,
          code,
          language,
          userId: user.id,
        });
      });

      socket.on("typing", ({ roomId }) => {
        if (!roomId) return;
        socket.to(roomId).emit("typing", {
          userId: user.id,
          name: socket.userData.name,
        });
      });

      socket.on("stop_typing", ({ roomId }) => {
        if (!roomId) return;
        socket.to(roomId).emit("stop_typing", { userId: user.id });
      });

      socket.on("cursor_move", ({ roomId, line, column }) => {
        if (!roomId) return;
        socket.to(roomId).emit("cursor_move", {
          userId: user.id,
          name: socket.userData.name,
          line,
          column,
        });
      });

      socket.on("whiteboard_draw", ({ roomId, action }) => {
        if (!roomId || !action) return;
        if (!roomWhiteboards.has(roomId)) {
          roomWhiteboards.set(roomId, []);
        }
        roomWhiteboards.get(roomId).push(action);
        socket.to(roomId).emit("whiteboard_draw", { action });
      });

      socket.on("whiteboard_clear", ({ roomId }) => {
        if (!roomId) return;
        roomWhiteboards.set(roomId, []);
        io.to(roomId).emit("whiteboard_clear", {});
      });

      socket.on("raise_hand", ({ roomId }) => {
        if (!roomId) return;
        updateParticipant(roomId, socket.id, { isHandRaised: true });
        broadcastParticipants(io, roomId);
      });

      socket.on("lower_hand", ({ roomId }) => {
        if (!roomId) return;
        updateParticipant(roomId, socket.id, { isHandRaised: false });
        broadcastParticipants(io, roomId);
      });

      socket.on("media_state", ({ roomId, isMicMuted, isCameraOff, isSpeaking }) => {
        if (!roomId) return;
        const updates = {};
        if (isMicMuted !== undefined) updates.isMicMuted = isMicMuted;
        if (isCameraOff !== undefined) updates.isCameraOff = isCameraOff;
        if (isSpeaking !== undefined) updates.isSpeaking = isSpeaking;
        updateParticipant(roomId, socket.id, updates);
        broadcastParticipants(io, roomId);
      });

      socket.on("webrtc_offer", ({ targetSocketId, offer }) => {
        if (!targetSocketId || !offer) return;
        io.to(targetSocketId).emit("webrtc_offer", {
          fromSocketId: socket.id,
          fromUserId: user.id,
          fromName: socket.userData.name,
          offer,
        });
      });

      socket.on("webrtc_answer", ({ targetSocketId, answer }) => {
        if (!targetSocketId || !answer) return;
        io.to(targetSocketId).emit("webrtc_answer", {
          fromSocketId: socket.id,
          answer,
        });
      });

      socket.on("ice_candidate", ({ targetSocketId, candidate }) => {
        if (!targetSocketId || !candidate) return;
        io.to(targetSocketId).emit("ice_candidate", {
          fromSocketId: socket.id,
          candidate,
        });
      });

      socket.on("meeting_end", ({ roomId }) => {
        if (!roomId) return;
        io.to(roomId).emit("meeting_end", { roomId });
      });

      socket.on("disconnect", () => {
        removeParticipant(socket, io);
        console.log(`User disconnected: ${socket.userData?.name} (${socket.id})`);
      });
    } catch (err) {
      console.error("Socket connection error:", err);
      socket.disconnect();
    }
  });
};

registerSocket.getRoomWhiteboard = (roomId) => roomWhiteboards.get(roomId) || [];

module.exports = registerSocket;
