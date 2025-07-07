const express = require("express");
const userRouter = require("../routes/userRoute");
const phoneRouter = require("../routes/phoneRoute");
const cartRouter = require("../routes/cartRoute");

const router = express.Router();

exports = module.exports = function (router) {
  router.get("/example", (req, res) => {
    res.send("This is an example route");
  });
  router.use("/users", userRouter);
  router.use("/phones", phoneRouter);
  router.use("/carts", cartRouter);
  // Add more routes here
};
