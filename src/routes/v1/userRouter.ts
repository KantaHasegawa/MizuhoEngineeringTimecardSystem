import express from "express";
import { authenticateToken, adminUserCheck } from "../../helper/helper";
import UserController from "../../controllers/userController";
import {
  signupUserValidation,
  editUserValidation,
} from "../../validation/userValidation";

const router = express.Router();
const Controller = new UserController();

router.get("/show/:name", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/ids", Controller.allIDs);
router.post(
  "/signup",
  authenticateToken,
  adminUserCheck,
  signupUserValidation,
  Controller.signup
);
router.post(
  "/edit",
  authenticateToken,
  adminUserCheck,
  editUserValidation,
  Controller.update
);
router.delete(
  "/delete/:name",
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
