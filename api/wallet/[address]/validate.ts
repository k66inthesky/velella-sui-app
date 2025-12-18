import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isWalletAddress } from '../../../backend/src/services/sui.service'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { address } = req.query

  // 驗證地址格式
  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    return res.status(400).json({
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: 'Invalid address format'
    })
  }

  // 驗證地址長度 (0x + 64 hex chars)
  if (address.length !== 66 || !/^0x[a-fA-F0-9]{64}$/.test(address)) {
    return res.status(400).json({
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: 'Invalid Sui address format (should be 0x + 64 hex characters)'
    })
  }

  try {
    const result = await isWalletAddress(address)
    return res.status(200).json({
      valid: true,
      address,
      ...result
    })
  } catch (error) {
    console.error('Error validating address:', error)
    return res.status(500).json({
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
