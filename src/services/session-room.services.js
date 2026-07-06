const { SessionRoom, Room } = require("../models");
const AppError = require("../utils/AppError");
const STATUS_CODES = require("../utils/statusCode");

class SessionRoomService {
  StartSession = async function (roomId, userId) {
    const room = await Room.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    if (room.is_private && room.created_by !== userId) {
      throw new AppError(
        "This is a private room. Host approval is required to join.",
        STATUS_CODES.FORBIDDEN
      );
    }

    const activeSession = await SessionRoom.findOne({
      where: { room_id: roomId, end_at: null },
      order: [["started_at", "DESC"]],
    });

    if (activeSession) {
      return activeSession;
    }

    const session = await SessionRoom.create({
      room_id: roomId,
      started_at: new Date(),
      participants: [],
    });

    return session;
  };

  EndSession = async function (roomId, userId, data) {
    const room = await Room.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    if (room.created_by !== userId) {
      throw new AppError("Only the host can end the meeting", STATUS_CODES.FORBIDDEN);
    }

    const session = await SessionRoom.findOne({
      where: { room_id: roomId, end_at: null },
      order: [["started_at", "DESC"]],
    });

    if (!session) {
      throw new AppError("No active session found", STATUS_CODES.NOT_FOUND);
    }

    session.end_at = new Date();
    session.final_code = data.final_code ?? session.final_code;
    session.participants = data.participants ?? session.participants;
    if (data.whiteboard_data !== undefined) {
      session.whiteboard_data = data.whiteboard_data;
    }
    await session.save();

    return session;
  };

  GetSessionByRoom = async function (roomId) {
    const room = await Room.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    const activeSession = await SessionRoom.findOne({
      where: { room_id: roomId, end_at: null },
      order: [["started_at", "DESC"]],
    });

    if (activeSession) {
      return activeSession;
    }

    const lastSession = await SessionRoom.findOne({
      where: { room_id: roomId },
      order: [["started_at", "DESC"]],
    });

    return lastSession;
  };
}

module.exports = new SessionRoomService();
