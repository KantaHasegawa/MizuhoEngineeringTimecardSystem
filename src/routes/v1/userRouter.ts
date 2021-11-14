import express from "express";
import { authenticateToken, adminUserCheck } from "../../helper/helper";
import {
  showUser,
  indexUser,
  signupUser,
  updateUser,
  deleteUser,
  userAllIDs,
} from "../../controllers/userController";
import {
  signupUserValidation,
  editUserValidation,
} from "../../validation/userValidation";
const router = express.Router();

router.get("/show/:name", authenticateToken, adminUserCheck, showUser);
router.get("/index", authenticateToken, adminUserCheck, indexUser);
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/ids", userAllIDs);
router.post(
  "/signup",
  authenticateToken,
  adminUserCheck,
  signupUserValidation,
  signupUser
);
router.post(
  "/edit",
  authenticateToken,
  adminUserCheck,
  editUserValidation,
  updateUser
);
router.delete("/delete/:name", authenticateToken, adminUserCheck, deleteUser);

export default router;
