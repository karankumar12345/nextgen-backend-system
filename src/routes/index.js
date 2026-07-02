


const express=require("express");
const router=express.Router();

const AuthRouter=require("./auth.routes");
const RoomRouter=require("./room.route");
const MessageRouter=require("./message.route");
const CodeSnapshotRouter=require("./code-snapshot.route");
const SessionRoomRouter=require("./session-room.route");
const CodeExecuteRouter=require("./code-execute.route");


router.use("/auth",AuthRouter);
router.use("/room",RoomRouter);
router.use("/messages",MessageRouter);
router.use("/code-snapshot",CodeSnapshotRouter);
router.use("/session",SessionRoomRouter);
router.use("/code",CodeExecuteRouter);

module.exports=router;
