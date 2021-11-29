import express from "express";
import { authenticateToken, adminUserCheck } from "../../helper/midleware";
import UserController from "../../controllers/userController";

const router = express.Router();
const Controller = new UserController();

router.get("/show", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
router.post("/signup", authenticateToken, adminUserCheck, Controller.signup);
router.post("/edit", authenticateToken, adminUserCheck, Controller.update);
router.delete(
  "/delete/:name",
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
