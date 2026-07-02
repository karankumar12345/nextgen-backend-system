const { CodeSnapshot, Room } = require("../models");
const AppError = require("../utils/AppError");
const STATUS_CODES = require("../utils/statusCode");

class CodeSnapshotService {
  GetSnapshotByRoom = async function (roomId) {
    const room = await Room.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    const snapshot = await CodeSnapshot.findOne({
      where: { room_id: roomId },
      order: [["created_at", "DESC"]],
    });

    return snapshot;
  };

  SaveSnapshot = async function (data) {
    const { room_id, code, language } = data;

    const room = await Room.findOne({ where: { room_id } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    const snapshot = await CodeSnapshot.create({
      room_id,
      code,
      language,
    });

    return snapshot;
  };
}

module.exports = new CodeSnapshotService();
