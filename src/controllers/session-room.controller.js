const asyncHandler = require("../utils/asyncHandler");
const STATUS_CODES = require("../utils/statusCode");
const { SessionRoomService } = require("../services");

class SessionRoomController {
  StartSession = asyncHandler(async (req, res) => {
    const { room_id } = req.body;
    const result = await SessionRoomService.StartSession(room_id, req.user.id);
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: "Session started successfully",
      data: result,
    });
  });

  EndSession = asyncHandler(async (req, res) => {
    const { room_id, final_code, participants, whiteboard_data } = req.body;
    const result = await SessionRoomService.EndSession(room_id, req.user.id, {
      final_code,
      participants,
      whiteboard_data,
    });
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Session ended successfully",
      data: result,
    });
  });

  GetSession = asyncHandler(async (req, res) => {
    const result = await SessionRoomService.GetSessionByRoom(req.params.roomId);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Session retrieved successfully",
      data: result,
    });
  });
}

module.exports = new SessionRoomController();
