const asyncHandler = require("../utils/asyncHandler");
const STATUS_CODES = require("../utils/statusCode");
const { RoomService } = require("../services");
class RoomController {
  CreateRoom = asyncHandler(async (req, res) => {
    const result = await RoomService.CreateRoom(req.body,req);
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: "Room created successfully",
      data: result,
    });
  });

  GetAllRooms = asyncHandler(async (req, res) => {
    const result = await RoomService.GetAllRooms();
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Rooms retrieved successfully",
      data: result,
    });
  });

  GetRoomById = asyncHandler(async (req, res) => {
    const result = await RoomService.GetRoomById(req.params.id);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Room retrieved successfully",
      data: result,
    });
  });
  UpdateRoom = asyncHandler(async (req, res) => {
    const result = await RoomService.UpdateRoom(req.params.id, req.body);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Room updated successfully",
      data: result,
    });
  });
}

module.exports = new RoomController();
