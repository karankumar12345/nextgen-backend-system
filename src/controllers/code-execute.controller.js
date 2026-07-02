const asyncHandler = require("../utils/asyncHandler");
const STATUS_CODES = require("../utils/statusCode");
const { Judge0Service } = require("../services");

class CodeExecuteController {
  Execute = asyncHandler(async (req, res) => {
    const { source_code, language } = req.body;
    const result = await Judge0Service.ExecuteCode({ source_code, language });
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Code executed successfully",
      data: result,
    });
  });
}

module.exports = new CodeExecuteController();
