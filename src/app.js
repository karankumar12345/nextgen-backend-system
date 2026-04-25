const express= require("express");
const app=express();
const cookieParser=require("cookie-parser");

const routes=require("./routes/index");





app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/v1",routes);
module.exports=app;