import express from "express";
import { adminUserCheck, authenticateToken } from "../../helper/midleware";
import WorkspotController from "../../controllers/workspotController";
const router = express.Router();
const Controller = new WorkspotController();

router.get("/show", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
router.post(
  "/new",
  authenticateToken,
  adminUserCheck,
  Controller.new
);
router.post(
  "/delete",
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
