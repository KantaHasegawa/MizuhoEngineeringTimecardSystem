import express from "express";
const router = express.Router();
import {
  adminUserCheck,
  authenticateToken,
  checkUserLocation,
} from "../../helper/midleware";
import TimecardController from "../../controllers/timecardController";
import csrfProtection from "../../helper/csurfSetting";

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
  "/excel/:username/:year/:month",
  authenticateToken,
  adminUserCheck,
  Controller.excel
);
router.post(
  "/common",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  checkUserLocation,
  Controller.common
);
router.post(
  "/admin/new",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.new
);
router.post(
  "/admin/edit",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.edit
);
router.post(
  "/admin/delete",
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  csrfProtection,
  authenticateToken,
  adminUserCheck,
  Controller.delete
);

export default router;
