import { Router } from 'express'
import { getObject, getFixedObject } from '../controllers/object.controller.js'

const router = Router()

// GET /api/object/fixed - 取得固定 Object (UserStory 3)
router.get('/fixed', getFixedObject)

// GET /api/object/:objectId - 取得任意 Object
router.get('/:objectId', getObject)

export default router
