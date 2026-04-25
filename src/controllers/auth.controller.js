const { AuthService } = require("../services");
const asyncHandler = require("../utils/asyncHandler");
const STATUS_CODES = require("../utils/statusCode");

class AuthController {
   RegisterUser =asyncHandler(async (req, res) =>{
    const result = await AuthService.RegisterUser({
      ...req.body,
      profile_pic: req.file || null,
    });
    res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: "User Registered Successfully",
      data: result,
    });
  })

  LoginUser=asyncHandler(async (req, res) => {

    const result = await AuthService.LoginUser(req,res,req.body);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  });

  RefreshAccessToken=asyncHandler(async(req,res)=>{
    const result = await AuthService.RefreshAccessToken(req);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Access token refreshed successfully",
      data: result,
    });
  })
  LogoutUser=asyncHandler(async(req,res)=>{
    await AuthService.logoutUser(req);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Logout successful",
    });

  })
  LogoutFromAllDevices=asyncHandler(async(req,res)=>{
    await AuthService.logoutFromAllDevices(req.user.id,res);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  })


  GetProfile=asyncHandler(async(req,res)=>{
    const result = await AuthService.GetProfile(req.user.id);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "User profile retrieved successfully",
      data: result,
    });
  })
  UpdateProfile=asyncHandler(async(req,res)=>{
    const result = await AuthService.UpdateProfile(req.user.id,req.body,req.file);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "User profile updated successfully",
      data: result,
    });
  })

  ChangePassword=asyncHandler(async(req,res)=>{
    await AuthService.ChangePassword(req.user.id,req.body.currentPassword,req.body.newPassword);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Password changed successfully",
    });
  })

  GetActiveSessions=asyncHandler(async(req,res)=>{
    const result = await AuthService.GetActiveSessions(req.user.id);
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Active sessions retrieved successfully",
      data: result,
    });
  })
  GetAllUsers=asyncHandler(async(req,res)=>{
    const result = await AuthService.GetAllUsers();
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  })

}
module.exports = new AuthController();
