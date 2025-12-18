import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SuiClient } from '@mysten/sui/client'

const MAINNET_RPC_URL = process.env.SUI_MAINNET_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
const mainnetClient = new SuiClient({ url: MAINNET_RPC_URL })

interface BalanceInfo {
  coinType: string
  totalBalance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

async function getWalletBalance(address: string) {
  const allBalances = await mainnetClient.getAllBalances({ owner: address })
  
  let suiBalance = '0'
  const otherBalances: typeof allBalances = []

  // 先分離 SUI 和其他代幣
  for (const balance of allBalances) {
    if (balance.coinType === '0x2::sui::SUI') {
      suiBalance = (Number(balance.totalBalance) / 1e9).toFixed(9)
    } else {
      otherBalances.push(balance)
    }
  }

  // 並行查詢所有代幣的 metadata（有 5 秒 timeout）
  const tokenPromises = otherBalances.map(async (balance) => {
    try {
      const metadataPromise = mainnetClient.getCoinMetadata({ coinType: balance.coinType })
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
      
      const metadata = await Promise.race([metadataPromise, timeoutPromise])
      const decimals = metadata?.decimals ?? 9
      const symbol = metadata?.symbol ?? balance.coinType.split('::').pop() || 'Unknown'
      const rawBalance = Number(balance.totalBalance)
      const formattedBalance = (rawBalance / Math.pow(10, decimals)).toString()
      
      return {
        coinType: balance.coinType,
        totalBalance: balance.totalBalance,
        decimals,
        symbol,
        formattedBalance
      }
    } catch {
      // 如果超時或失敗，使用預設值
      const rawBalance = Number(balance.totalBalance)
      return {
        coinType: balance.coinType,
        totalBalance: balance.totalBalance,
        decimals: 9,
        symbol: balance.coinType.split('::').pop() || 'Unknown',
        formattedBalance: (rawBalance / 1e9).toString()
      }
    }
  })

  const tokens = await Promise.all(tokenPromises)

  return { address, suiBalance, tokens }
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
