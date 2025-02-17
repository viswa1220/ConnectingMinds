 const adminAuth =(req,res,next)=>{
    const token="xyz"
    const adminAuth = token =="xyz";
    if(!adminAuth){
       res.status(401).send("unauthorized request");
    }else{
       next();
    }
 };
 module.exports={adminAuth};