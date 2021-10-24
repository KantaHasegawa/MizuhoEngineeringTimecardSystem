import express from 'express';
import { adminUserCheck, authenticateToken } from "../../helper/helper";
import {showWorkspot, indexWorkspot, indexWorkspotNameOnly, newWorkspot,deleteWorkspot,updateWorkspotRelation,indexWorkspotRelation} from '../../controllers/workspotController'
const router = express.Router();

router.get("/show/:name", authenticateToken, adminUserCheck, showWorkspot)
router.get("/index", authenticateToken, adminUserCheck, indexWorkspot)
router.get("/indexnameonly", authenticateToken, adminUserCheck, indexWorkspotNameOnly)
router.get("/relation/index/:workspot", authenticateToken, adminUserCheck, indexWorkspotRelation)
router.post("/new", authenticateToken, adminUserCheck, newWorkspot)
router.post("/relation/update", authenticateToken, adminUserCheck, updateWorkspotRelation)
router.post("/delete", authenticateToken, adminUserCheck, deleteWorkspot)

export default router;
