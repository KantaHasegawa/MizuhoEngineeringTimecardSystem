import express from "express";
const router = express.Router();
import {
  adminUserCheck,
  adminUserOrAuthenticatedUserCheck,
  authenticateToken,
} from "../../helper/midleware";
import RelationController from "../../controllers/relationController";

const Controller = new RelationController();

router.get(
  "/user/:username",
  authenticateToken,
  adminUserOrAuthenticatedUserCheck,
  Controller.indexUser
);
router.get(
  "/user/selectbox/:username",
  authenticateToken,
  Controller.userSelectBoxItems
);
router.get("/workspot/:workspot", authenticateToken, Controller.indexWorkspot);
router.get(
  "/workspot/selectbox/:workspot",
  authenticateToken,
  Controller.workspotSelectBoxItems
);
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
