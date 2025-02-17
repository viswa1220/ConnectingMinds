const express = require("express");
const { adminAuth } = require("./middlewares/auth");
const connectDb = require("./config/database");
const app = express();
const User = require("./models/user");
app.use(express.json());
/* get : will match only /user  */
app.post("/signup", async (req, res) => {
  //creating a new instance of user model
  const user = new User(req.body);
  try {
    await user.save();
    res.send("user added");
  } catch (err) {
    res.status(401).send("Error in User Adding" + err.message);
  }
});

connectDb()
  .then(() => {
    console.log("Connected to mongo Db");
    //listen port
    app.listen(3000, () => {
      console.log("running in 3000");
    });
  })
  .catch((err) => {
    console.log("error to connect mongo Db");
  });
