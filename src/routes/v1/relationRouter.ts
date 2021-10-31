import express from 'express';
const router = express.Router();
import {adminUserCheck, authenticateToken} from "../../helper/helper";
import {indexUserRelation, UserRelationSelectBoxItems, indexWorkspotRelation, workspotRelationSelectBoxItems, newRelation, deleteRelation} from '../../controllers/relationController'

router.get("/user/:username", authenticateToken, adminUserCheck, indexUserRelation)
router.get("/user/selectbox/:username", authenticateToken, UserRelationSelectBoxItems)
router.get("/workspot/:workspot", authenticateToken, indexWorkspotRelation)
router.get("/workspot/selectbox/:workspot",authenticateToken,workspotRelationSelectBoxItems);
router.post("/new", authenticateToken, adminUserCheck, newRelation);
router.post("/delete", authenticateToken,adminUserCheck, deleteRelation)

export default router;
