const AuthService = require("./auth.services");
const RoomService = require("./room.services");
const MessageService = require("./message.services");
const CodeSnapshotService = require("./code-snapshot.services");
const SessionRoomService = require("./session-room.services");
const Judge0Service = require("./judge0.services");

module.exports = {
  AuthService,
  RoomService: new RoomService(),
  MessageService,
  CodeSnapshotService,
  SessionRoomService,
  Judge0Service,
};