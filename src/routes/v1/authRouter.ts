import express from "express";
import AuthController from "../../controllers/authController";
import { authenticateToken } from "../../helper/midleware";

const router = express.Router();
const Controller = new AuthController();
router.post("/login", Controller.login);
router.get("/logout", authenticateToken, Controller.logout);
router.get("/refresh", Controller.token);
router.get("/currentuser", Controller.currentuser);

export default router;
