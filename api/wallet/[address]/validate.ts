import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SuiClient } from '@mysten/sui/client'

const MAINNET_RPC_URL = process.env.SUI_MAINNET_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
const mainnetClient = new SuiClient({ url: MAINNET_RPC_URL })

async function isWalletAddress(address: string) {
  try {
    try {
      const objectInfo = await mainnetClient.getObject({
        id: address,
        options: { showType: true, showContent: true }
      })
      
      if (objectInfo.data?.content?.dataType === 'package') {
        return { isWallet: false, isPackage: true, hasActivity: false, error: 'This is a contract/package address, not a wallet address' }
      }
    } catch {
      // 查詢 object 失敗，可能是錢包地址
    }
    
    const [ownedObjects, balances] = await Promise.all([
      mainnetClient.getOwnedObjects({ owner: address, limit: 1 }),
      mainnetClient.getAllBalances({ owner: address }).catch(() => [])
    ])
    
    const hasActivity = (ownedObjects.data && ownedObjects.data.length > 0) || 
                        (Array.isArray(balances) && balances.length > 0)
    
    return { isWallet: true, isPackage: false, hasActivity }
  } catch (error) {
    return { 
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: error instanceof Error ? error.message : 'Invalid address'
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

  const { address } = req.query

  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    return res.status(400).json({
      valid: false,
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: 'Invalid address format'
    })
  }

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
      error: 'Failed to validate address',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
