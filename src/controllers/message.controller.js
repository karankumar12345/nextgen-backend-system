const asyncHandler = require("../utils/asyncHandler");
const STATUS_CODES = require("../utils/statusCode");
const { MessageService } = require("../services");

class MessageController {
  GetMessages = asyncHandler(async (req, res) => {
    const result = await MessageService.GetMessagesByRoom(req.params.roomId);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Messages retrieved successfully",
      data: result,
    });
  });

  CreateMessage = asyncHandler(async (req, res) => {
    const result = await MessageService.CreateMessage(req.body, req.user.id);
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: "Message sent successfully",
      data: result,
    });
  });
}

module.exports = new MessageController();
