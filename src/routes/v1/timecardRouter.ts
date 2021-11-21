import express from "express";
const router = express.Router();
import {
  adminUserCheck,
  authenticateToken,
  checkUserLocation,
} from "../../helper/helper";
import TimecardController from "../../controllers/timecardController";

const Controller = new TimecardController();

router.get(
  "/index/:username/:year/:month",
  authenticateToken,
  adminUserCheck,
  Controller.index
);
router.get("/latest/:username", authenticateToken, Controller.latest);
router.get("/latestall", Controller.latestAll);
router.get(
  "/excel/:username/:year/:month",
  authenticateToken,
  adminUserCheck,
  Controller.excel
);
router.post("/common", authenticateToken, checkUserLocation, Controller.common);
router.post(
  "/admin/new",
  authenticateToken,
  adminUserCheck,
  Controller.new
);
router.post(
  "/admin/delete",
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
