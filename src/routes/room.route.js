

const express =require('express');
const { RoomController } = require('../controllers');
const authMiddleware = require('../middleware/auth.middleware');

const router=  express.Router();




router.get('/get-all-rooms',authMiddleware,RoomController.GetAllRooms);

router.post('/create-room',authMiddleware,RoomController.CreateRoom);

router.get('/get-room/:id',authMiddleware,RoomController.GetRoomById);

router.put('/update-room/:id',authMiddleware,RoomController.UpdateRoom);

module.exports=router;