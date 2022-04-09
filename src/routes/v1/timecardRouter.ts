import express from "express";
const router = express.Router();
import {
  adminUserCheck,
  authenticateToken,
  checkUserLocation,
} from "../../helper/midleware";
import TimecardController from "../../controllers/timecardController";

const Controller = new TimecardController();

router.get("/show", authenticateToken, adminUserCheck, Controller.show);
router.get(
  "/index/:username/:year/:month",
  authenticateToken,
  adminUserCheck,
  Controller.index
);
router.get("/latest/:username", authenticateToken, Controller.latest);
router.get("/latestall", Controller.latestAll);
router.get(
  "/excel/:username/:year/:month/:isMobile",
  authenticateToken,
  adminUserCheck,
  Controller.excel
);
router.post(
  "/common",
  authenticateToken,
  checkUserLocation,
  Controller.common
);
router.post(
  "/admin/new",
  authenticateToken,
  adminUserCheck,
  Controller.new
);
router.post(
  "/admin/edit",
  authenticateToken,
  adminUserCheck,
  Controller.edit
);
router.post(
  "/admin/delete",
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
