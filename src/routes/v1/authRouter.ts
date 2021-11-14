import express from "express";
import {
  login,
  token,
  logout,
  currentuser,
} from "../../controllers/authController";
import { authenticateToken } from "../../helper/helper";
const router = express.Router();

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.post("/login", login);
router.post("/logout", authenticateToken, logout);
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.post("/refresh", token);
router.get("/currentuser", currentuser);

export default router;
