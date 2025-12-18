import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SuiClient } from '@mysten/sui/client'

const TESTNET_RPC_URL = process.env.SUI_TESTNET_RPC_URL || 'https://fullnode.testnet.sui.io:443'
const testnetClient = new SuiClient({ url: TESTNET_RPC_URL })

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

  const { objectId } = req.query

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
