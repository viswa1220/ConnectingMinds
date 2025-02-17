 const express=require("express")

 const app=express();

 ///req handler
 app.use("/test",(req,res)=>{
    res.send("hello from server!!!");
 })
 //listen port
 app.listen(3000, () => {
    console.log("running in 3000");
 })