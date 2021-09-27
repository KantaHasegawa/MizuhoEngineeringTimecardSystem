const express = require('express');
const router = express.Router();

router.get("/", (req, res) => {
  const env = process.env.NODE_ENV
  res.json({ message: `env is ${env}` });
});
router.use('/user', require('./user.js'));
router.use('/auth', require('./auth.js'));

module.exports = router;
