import express from "express";
import { adminUserCheck, authenticateToken } from "../../helper/midleware";
import WorkspotController from "../../controllers/workspotController";
import csrfProtection from "../../helper/csurfSetting";
const router = express.Router();
const Controller = new WorkspotController();

router.get("/show", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
router.post(
  "/new",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.new
);
router.post(
  "/delete",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
