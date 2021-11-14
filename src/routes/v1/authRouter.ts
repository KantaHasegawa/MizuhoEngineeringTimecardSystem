import express from "express";
import {
  login,
  token,
  logout,
  currentuser,
} from "../../controllers/authController";
import { authenticateToken } from "../../helper/helper";
const router = express.Router();

router.post("/login", login);
router.post("/logout", authenticateToken, logout);
router.post("/refresh", token);
router.get("/currentuser", currentuser);

export default router;
