import express from "express";
import AuthController from "../../controllers/authController";
import { authenticateToken } from "../../helper/helper";
const router = express.Router();
const Controller = new AuthController();
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.post("/login", Controller.login);
router.get("/logout", authenticateToken, Controller.logout);
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/refresh", Controller.token);
router.get("/currentuser", Controller.currentuser);

export default router;
