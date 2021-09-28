const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.send(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.send(403);
    req.user = user;
    next();
  });
}

const adminUserCheck = (req, res, next) => {
  if(req.user.role !== "admin"){return res.send(403)}
  next();
}

module.exports = {
  authenticateToken: authenticateToken,
  adminUserCheck: adminUserCheck
}
