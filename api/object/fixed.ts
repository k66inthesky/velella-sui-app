import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getObjectFields } from '../_lib/sui.service'

// 從環境變數取得固定的 Object ID
const FIXED_OBJECT_ID = process.env.TESTNET_OBJECT_ID || ''

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

  if (!FIXED_OBJECT_ID) {
    return res.status(500).json({ error: 'TESTNET_OBJECT_ID not configured' })
  }

  try {
    const result = await getObjectFields(FIXED_OBJECT_ID)

    if (result.error) {
      return res.status(404).json(result)
    }

    // 解析並回傳 Admin / Id / Balance 欄位
    const fields = result.fields || {}
    return res.status(200).json({
      objectId: FIXED_OBJECT_ID,
      network: 'testnet',
      data: {
        admin: fields.admin ?? null,
        id: fields.id ?? null,
        balance: fields.balance ?? null
      },
      rawFields: fields
    })
  } catch (error) {
    console.error('Error fetching fixed object:', error)
    return res.status(500).json({
      error: 'Failed to fetch object',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
