const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Hello World! root directory!!" });
});
router.get("/users", (req, res) => {
  res.json({message: "user list!!"});
});

module.exports = router;
