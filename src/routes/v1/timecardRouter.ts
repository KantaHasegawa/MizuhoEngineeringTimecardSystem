import express from "express";
const router = express.Router();
import {
  adminUserCheck,
  authenticateToken,
  checkUserLocation,
} from "../../helper/helper";
import { adminNewTimecardValidation } from "../../validation/timecardValidation";
import {
  indexTimecard,
  latestTimecard,
  commonTimecard,
  adminNewTimecard,
  adminDeleteTimecard,
  excelTimecard,
  getAllUserLatestTimecard,
} from "../../controllers/timecardController";

router.get(
  "/index/:username/:year/:month",
  authenticateToken,
  adminUserCheck,
  indexTimecard
);
router.get("/latest/:username", authenticateToken, latestTimecard);
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/latestall", getAllUserLatestTimecard);
router.get(
  "/excel/:username/:year/:month",
  authenticateToken,
  adminUserCheck,
  excelTimecard
);
router.post("/common", authenticateToken, checkUserLocation, commonTimecard);
router.post(
  "/admin/new",
  authenticateToken,
  adminUserCheck,
  adminNewTimecardValidation,
  adminNewTimecard
);
router.post(
  "/admin/delete",
  authenticateToken,
  adminUserCheck,
  adminDeleteTimecard
);

export default router;
