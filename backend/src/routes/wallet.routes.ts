import { Router } from 'express'
import { getBalance, validateAddress } from '../controllers/wallet.controller.js'

const router = Router()

// GET /api/wallet/:address/validate - 驗證地址是否為有效錢包地址
router.get('/:address/validate', validateAddress)

// GET /api/wallet/:address/balance
router.get('/:address/balance', getBalance)

export default router
