


const express=require("express");
const router=express.Router();

const AuthRouter=require("./auth.routes");



router.use("/auth",AuthRouter);


module.exports=router;
