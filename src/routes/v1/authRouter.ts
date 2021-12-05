import express from "express";
import AuthController from "../../controllers/authController";
import { authenticateToken } from "../../helper/midleware";
import csrfProtection from "../../helper/csurfSetting";

const router = express.Router();
const Controller = new AuthController();
router.post("/login", Controller.login);
router.get("/logout", authenticateToken, Controller.logout);
router.get("/refresh", Controller.token);
router.get("/currentuser", Controller.currentuser);
router.get("/csrf", csrfProtection, Controller.csrf);

export default router;
