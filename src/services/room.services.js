const { Room, User, Message } = require("../models");
const AppError = require("../utils/AppError");
const STATUS_CODES = require("../utils/statusCode");
class RoomService {
  CreateRoom = async function (data, req) {
    try {
      const { room_name, description, room_type, is_private } = data;

      const room_id = `room_${Date.now()}`;
      const newRoom = await Room.create({
        room_id,
        room_name,
        description,
        room_type,
        is_private,
        created_by: req.user.id,
      });
      return newRoom;
    } catch (error) {
      throw error;
    }
  };
  UpdateRoom = async function (roomId, data) {
    try {
      const room = await Room.findOne({ where: { room_id: roomId } });
      if (!room) {
        throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
      }
      const { room_name, description, room_type, is_private } = data;
      room.room_name = room_name || room.room_name;
      room.description = description || room.description;
      room.room_type = room_type || room.room_type;
      room.is_private = is_private !== undefined ? is_private : room.is_private;
      await room.save();
      return room;

    } catch (error) {
      throw error;
    }
  };
  GetAllRooms = async function () {
    try {

      const rooms = await Room.findAll({
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["username", "full_name", "profile_pic"],
          },
          {
            model: Message,
            as: "messages",
            attributes: ["message", "created_at"],
            limit: 1,
            order: [["created_at", "DESC"]],
          },
        ],
      });
      return rooms;
    } catch (error) {
      throw error;
    }
  };
  GetRoomById = async function (roomId) {
    try {
      const room = await Room.findOne({
        where: { room_id: roomId },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "full_name", "email", "profile_pic"],
          },
        ],
      });

      if (!room) {
        throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
      }

      const plain = room.toJSON();
      if (plain.creator) {
        plain.creator = {
          id: plain.creator.id,
          name: plain.creator.full_name,
          email: plain.creator.email,
          profile_pic: plain.creator.profile_pic,
        };
      }

      return plain;
    } catch (error) {
      throw error;
    }
  };
}
module.exports = RoomService;
