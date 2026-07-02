const { Message, Room, User } = require("../models");
const AppError = require("../utils/AppError");
const STATUS_CODES = require("../utils/statusCode");

class MessageService {
  GetMessagesByRoom = async function (roomId) {
    const room = await Room.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    const messages = await Message.findAll({
      where: { room_id: roomId },
      include: [
        {
          model: User,
          as: "sender_user",
          attributes: ["id", "full_name", "username", "profile_pic"],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    return messages;
  };

  CreateMessage = async function (data, userId) {
    const { room_id, message } = data;

    const room = await Room.findOne({ where: { room_id } });
    if (!room) {
      throw new AppError("Room not found", STATUS_CODES.NOT_FOUND);
    }

    const newMessage = await Message.create({
      room_id,
      sender: userId,
      message,
    });

    const result = await Message.findByPk(newMessage.id, {
      include: [
        {
          model: User,
          as: "sender_user",
          attributes: ["id", "full_name", "username", "profile_pic"],
        },
      ],
    });

    return result;
  };
}

module.exports = new MessageService();
