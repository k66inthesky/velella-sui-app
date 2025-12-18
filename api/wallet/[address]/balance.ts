import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWalletBalance } from '../../../backend/src/services/sui.service'

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

  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid address format' })
  }

  try {
    const result = await getWalletBalance(address)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Error fetching balance:', error)
    return res.status(500).json({
      error: 'Failed to fetch balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
