const STATUS_CODES = require("./statusCode");

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return resizeBy.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};
module.exports = validate;
