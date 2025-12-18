import { Request, Response } from 'express'
import { getWalletBalance, isWalletAddress } from '../services/sui.service.js'

/**
 * 驗證地址是否為有效的錢包地址
 * GET /api/wallet/:address/validate
 */
export async function validateAddress(req: Request, res: Response) {
  const { address } = req.params

  // 驗證地址格式
  if (!address || !address.startsWith('0x')) {
    res.status(400).json({ 
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: 'Invalid address format' 
    })
    return
  }

  // 驗證地址長度 (0x + 64 hex chars)
  if (address.length !== 66 || !/^0x[a-fA-F0-9]{64}$/.test(address)) {
    res.status(400).json({ 
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: 'Invalid Sui address format (should be 0x + 64 hex characters)' 
    })
    return
  }

  try {
    const result = await isWalletAddress(address)
    res.json({
      valid: true,
      address,
      ...result
    })
  } catch (error) {
    console.error('Error validating address:', error)
    res.status(500).json({ 
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * 查詢錢包餘額
 * GET /api/wallet/:address/balance
 */
export async function getBalance(req: Request, res: Response) {
  const { address } = req.params

  // 驗證地址格式
  if (!address || !address.startsWith('0x')) {
    res.status(400).json({ error: 'Invalid address format' })
    return
  }

  try {
    const result = await getWalletBalance(address)
    res.json(result)
  } catch (error) {
    console.error('Error fetching balance:', error)
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
