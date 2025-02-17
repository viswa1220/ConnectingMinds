 const express=require("express")

 const app=express();
 /* get : will match only /user  */

 app.get("/user",(req,res)=>{
   res.send("user get");
 });
 app.post("/user",(req,res)=>{
   res.send("data saved");
 });

 /* Use : will match all the http method api calls  */

 ///req handler
 app.use("/test",(req,res)=>{
    res.send("hello from server!!!");
 })
 app.use("/",(req,res)=>{
   res.send("hello Stranger!!!");
})
 //listen port
 app.listen(3000, () => {
    console.log("running in 3000");
 })