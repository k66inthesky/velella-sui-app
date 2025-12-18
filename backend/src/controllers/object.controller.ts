import { Request, Response } from 'express'
import { getObjectFields } from '../services/sui.service.js'

// 從環境變數取得固定的 Object ID
const FIXED_OBJECT_ID = process.env.TESTNET_OBJECT_ID || ''

/**
 * 取得固定 Object 資料 (UserStory 3)
 * GET /api/object/fixed
 */
export async function getFixedObject(_req: Request, res: Response) {
  if (!FIXED_OBJECT_ID) {
    res.status(500).json({ error: 'TESTNET_OBJECT_ID not configured' })
    return
  }

  try {
    const result = await getObjectFields(FIXED_OBJECT_ID)
    
    if (result.error) {
      res.status(404).json(result)
      return
    }

    // 解析並回傳 Admin / Id / Balance 欄位
    const fields = result.fields || {}
    res.json({
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
    res.status(500).json({ 
      error: 'Failed to fetch object',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * 查詢 Object 資料
 * GET /api/object/:objectId
 */
export async function getObject(req: Request, res: Response) {
  const { objectId } = req.params

  // 驗證 Object ID 格式
  if (!objectId || !objectId.startsWith('0x')) {
    res.status(400).json({ error: 'Invalid object ID format' })
    return
  }

  try {
    const result = await getObjectFields(objectId)
    
    if (result.error) {
      res.status(404).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    console.error('Error fetching object:', error)
    res.status(500).json({ 
      error: 'Failed to fetch object',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
