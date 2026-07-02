const asyncHandler = require("../utils/asyncHandler");
const STATUS_CODES = require("../utils/statusCode");
const { CodeSnapshotService } = require("../services");

class CodeSnapshotController {
  GetSnapshot = asyncHandler(async (req, res) => {
    const result = await CodeSnapshotService.GetSnapshotByRoom(req.params.roomId);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Code snapshot retrieved successfully",
      data: result,
    });
  });

  SaveSnapshot = asyncHandler(async (req, res) => {
    const result = await CodeSnapshotService.SaveSnapshot(req.body);
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: "Code snapshot saved successfully",
      data: result,
    });
  });
}

module.exports = new CodeSnapshotController();
