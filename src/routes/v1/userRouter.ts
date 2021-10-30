import express from 'express';
import { authenticateToken, adminUserCheck } from '../../helper/helper'
import { showUser, indexUser, signupUser, updateUser, deleteUser, indexUserRelation, UserRelationSelectBoxItems, updateUserRelation, userAllIDs } from '../../controllers/userController'
import {signupUserValidation, editUserValidation} from '../../validation/userValidation'
const router = express.Router();

router.get('/show/:name', authenticateToken, adminUserCheck, showUser)
router.get('/index', authenticateToken, adminUserCheck, indexUser)
router.get('/ids', userAllIDs)
router.get('/relation/index/:username', authenticateToken, adminUserCheck, indexUserRelation)
router.get('/relation/selectbox/:username', authenticateToken, adminUserCheck, UserRelationSelectBoxItems)
router.post('/signup', authenticateToken, adminUserCheck, signupUserValidation, signupUser)
router.post('/edit', authenticateToken, adminUserCheck, editUserValidation, updateUser)
router.post('/relation/update', authenticateToken, adminUserCheck, updateUserRelation)
router.delete('/delete/:name', authenticateToken, adminUserCheck, deleteUser)

export default router;
