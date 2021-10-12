import express from "express"
const jwt = require("jsonwebtoken");

export const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.send(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err: any, user: any) => {
    if (err) return res.send(403);
    req.user = user;
    next();
  });
}

export const adminUserCheck = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if(req.user.role !== "admin"){return res.send(403)}
  next();
}
