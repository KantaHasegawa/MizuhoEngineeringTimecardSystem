import express from "express";
import { authenticateToken, adminUserCheck } from "../../helper/helper";
import UserController from "../../controllers/userController";

const router = express.Router();
const Controller = new UserController();

router.get("/show/:name", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
router.get("/ids", Controller.allIDs);
router.post(
  "/signup",
  authenticateToken,
  adminUserCheck,
  Controller.signup
);
router.post(
  "/edit",
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
