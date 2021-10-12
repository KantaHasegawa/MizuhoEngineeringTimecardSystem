import express from 'express';
import { authenticateToken, adminUserCheck } from '../../helper/helper'
import { showUser, indexUser, signupUser, deleteUser, indexUserRelation, updateUserRelation } from '../../controllers/userController'
import {signupUserValidation} from '../../validation/userValidation'
const router = express.Router();

router.get('/show/:name', authenticateToken, adminUserCheck, showUser)
router.get('/index', authenticateToken, adminUserCheck, indexUser)
router.get('/relation/index/:username', authenticateToken,adminUserCheck, indexUserRelation)
router.post('/signup', authenticateToken, adminUserCheck, signupUserValidation, signupUser)
router.post('/relation/update', authenticateToken, adminUserCheck, updateUserRelation)
router.delete('/delete/:name', authenticateToken, adminUserCheck, deleteUser)

export default router;
