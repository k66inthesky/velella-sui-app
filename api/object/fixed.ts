import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SuiClient } from '@mysten/sui/client'

const TESTNET_RPC_URL = process.env.SUI_TESTNET_RPC_URL || 'https://fullnode.testnet.sui.io:443'
const testnetClient = new SuiClient({ url: TESTNET_RPC_URL })
const FIXED_OBJECT_ID = process.env.TESTNET_OBJECT_ID || ''

async function getObjectFields(objectId: string) {
  try {
    const object = await testnetClient.getObject({
      id: objectId,
      options: {
        showContent: true,
        showType: true
      }
    })

    if (object.error) {
      return {
        objectId,
        fields: null,
        error: object.error.code
      }
    }

    if (object.data?.content?.dataType === 'moveObject') {
      return {
        objectId,
        fields: object.data.content.fields as Record<string, unknown>
      }
    }

    return {
      objectId,
      fields: null,
      error: 'Not a Move object'
    }
  } catch (error) {
    return {
      objectId,
      fields: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
