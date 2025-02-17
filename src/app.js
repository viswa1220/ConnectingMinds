const express = require("express");
const { adminAuth } = require("./middlewares/auth");
const app = express();
/* get : will match only /user  */

app.get("/user", (req, res) => {
  res.send("user get");
});
app.post("/user", (req, res) => {
  res.send("data saved");
});

/* Use : will match all the http method api calls  */

///req handler
app.use("/test", (req, res) => {
  res.send("hello from server!!!");
});

/* handle auth for all req get post patch delete put*/
app.use("/admin", adminAuth);

app.use("/admin/test", (req, res) => {
  res.send("hello from test server!!!");
});
app.use("/admin/testone", (req, res) => {
  res.send("hello from test 1 server!!!");
});

app.use("/userwithoutAuth", (req, res) => {
  res.send("userwithoutAuth");
});

// if there is no response it will hang and next will be used to go for second response;
app.use(
  "/stranger",
  (req, res, next) => {
    // res.send("hello Stranger!!!");
    next();
  },
  (req, res) => {
    res.send("hello Stranger!!! 2");
  }
);
//listen port
app.listen(3000, () => {
  console.log("running in 3000");
});
