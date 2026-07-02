const axios = require("axios");
const AppError = require("../utils/AppError");
const STATUS_CODES = require("../utils/statusCode");

const LANGUAGE_MAP = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  go: 60,
  rust: 73,
};

const JUDGE0_BASE_URL =
  process.env.JUDGE0_API_URL || "https://ce.judge0.com";

class Judge0Service {
  ExecuteCode = async function ({ source_code, language }) {
    const language_id = LANGUAGE_MAP[language];
    if (!language_id) {
      throw new AppError("Unsupported language", STATUS_CODES.BAD_REQUEST);
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (process.env.JUDGE0_API_KEY) {
        headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
        headers["X-RapidAPI-Host"] =
          process.env.JUDGE0_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
      }

      const response = await axios.post(
        `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
        { source_code, language_id },
        { headers, timeout: 30000 }
      );

      const result = response.data;
      const statusDesc = result.status?.description || "Unknown";

      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        compile_output: result.compile_output || "",
        status: statusDesc,
        time: result.time,
        memory: result.memory,
        success: statusDesc === "Accepted",
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Code execution failed";
      throw new AppError(message, STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  };
}

module.exports = new Judge0Service();
