import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // 測試 import
    const { SuiClient } = await import('@mysten/sui/client')
    const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' })
    
    // 簡單測試
    const balance = await client.getBalance({ 
      owner: '0x1a66b986f6e938c9f6d4cf7b98c97c331165cad5759e13fbbb1dee01728841dd' 
    })
    
    return res.status(200).json({ 
      success: true, 
      balance: balance.totalBalance 
    })
  } catch (error) {
    return res.status(500).json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
