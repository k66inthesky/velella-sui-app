import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getObjectFields } from '../../backend/src/services/sui.service'

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

  const { objectId } = req.query

  // 驗證 Object ID 格式
  if (!objectId || typeof objectId !== 'string' || !objectId.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid object ID format' })
  }

  try {
    const result = await getObjectFields(objectId)

    if (result.error) {
      return res.status(404).json(result)
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error fetching object:', error)
    return res.status(500).json({
      error: 'Failed to fetch object',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
