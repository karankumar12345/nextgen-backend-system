const { Op } = require("sequelize");
const { Room, User, Message, SessionRoom } = require("../models");
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
  GetAllRooms = async function (userId) {
    try {
      const rooms = await Room.findAll({
        where: {
          [Op.or]: [{ is_private: false }, { created_by: userId }],
        },
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
          {
            model: SessionRoom,
            as: "session_rooms",
            attributes: ["id", "end_at", "participants"],
            limit: 1,
            order: [["started_at", "DESC"]],
          },
        ],
        order: [["created_at", "DESC"]],
      });
      return rooms;
    } catch (error) {
      throw error;
    }
  };

  GetRoomById = async function (roomId, userId) {
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

      const isHost = plain.created_by === userId;
      plain.is_host = isHost;
      plain.can_join = !plain.is_private || isHost;

      return plain;
    } catch (error) {
      throw error;
    }
  };

  GetDashboard = async function (userId) {
    try {
      const visibleRoomFilter = {
        [Op.or]: [{ is_private: false }, { created_by: userId }],
      };

      const [totalRooms, activeSessions, completedSessions, rooms, recentMessages] =
        await Promise.all([
          Room.count({ where: visibleRoomFilter }),
          SessionRoom.count({ where: { end_at: null } }),
          SessionRoom.count({ where: { end_at: { [Op.ne]: null } } }),
          Room.findAll({
            where: visibleRoomFilter,
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["username", "full_name", "profile_pic"],
              },
              {
                model: SessionRoom,
                as: "session_rooms",
                attributes: ["id", "end_at", "participants", "started_at"],
                limit: 1,
                order: [["started_at", "DESC"]],
              },
            ],
            order: [["created_at", "DESC"]],
            limit: 5,
          }),
          Message.findAll({
            include: [
              {
                model: User,
                as: "sender_user",
                attributes: ["id", "full_name", "username"],
              },
              {
                model: Room,
                as: "room",
                attributes: ["room_id", "room_name", "is_private", "created_by"],
              },
            ],
            order: [["created_at", "DESC"]],
            limit: 10,
          }),
        ]);

      const activeSessionRows = await SessionRoom.findAll({
        where: { end_at: null },
        attributes: ["participants"],
      });

      let totalParticipants = 0;
      activeSessionRows.forEach((session) => {
        const count = Array.isArray(session.participants)
          ? session.participants.length
          : 0;
        totalParticipants += count;
      });

      const recentRooms = rooms.map((room) => {
        const plain = room.toJSON();
        console.log("plain", plain);
        const latestSession = plain.session_rooms?.[0];
        const isActive = latestSession && !latestSession.end_at;
        const participantCount = isActive
          ? Array.isArray(latestSession.participants)
            ? latestSession.participants.length
            : 0
          : 0;

        return {
          id: plain.id,
          room_id: plain.room_id,
          name: plain.room_name,
          participants: participantCount,
          status: isActive ? "Active" : "Completed",
          createdAt: plain.started_at,
          is_private: plain.is_private,

        };
      });

      const visibleActivities = recentMessages.filter((msg) => {
        const room = msg.room;
        if (!room) return false;
        return !room.is_private || room.created_by === userId;
      });

      const recentActivities = visibleActivities.map((msg) => {
        const plain = msg.toJSON();
        const senderName =
          plain.sender_user?.full_name ||
          plain.sender_user?.username ||
          "Someone";
        const roomName = plain.room?.room_name || "a room";
        return {
          id: plain.id,
          user: senderName,
          action: `sent a message in "${roomName}"`,
          time: plain.created_at,
        };
      });

      return {
        stats: {
          totalRooms,
          activeMeetings: activeSessions,
          completedSessions,
          totalParticipants,
        },
        recentRooms,
        recentActivities,
      };
    } catch (error) {
      throw error;
    }
  };
}
module.exports = RoomService;
