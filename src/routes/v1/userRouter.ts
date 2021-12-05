import express from "express";
import { authenticateToken, adminUserCheck } from "../../helper/midleware";
import UserController from "../../controllers/userController";
import csrfProtection from "../../helper/csurfSetting";

const router = express.Router();
const Controller = new UserController();

router.get("/show", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
router.post(
  "/signup",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.signup
);
router.post(
  "/edit",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.update
);
router.delete(
  "/delete/:name",
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
