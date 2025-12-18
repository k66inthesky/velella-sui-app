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

// 使用 Promise.race 實現正確的 timeout
async function fetchMetadataWithTimeout(coinType: string, timeoutMs: number = 3000) {
  const metadataPromise = mainnetClient.getCoinMetadata({ coinType })
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs)
  })
  
  // 誰先完成就用誰的結果，timeout 時返回 null
  return Promise.race([metadataPromise, timeoutPromise])
}

async function getWalletBalance(address: string) {
  const allBalances = await mainnetClient.getAllBalances({ owner: address })
  
  let suiBalance = '0'
  const tokens: BalanceInfo[] = []

  for (const balance of allBalances) {
    if (balance.coinType === '0x2::sui::SUI') {
      suiBalance = (Number(balance.totalBalance) / 1e9).toFixed(9)
    }
  }

  // 取得非 SUI 代幣並並行查詢 metadata
  const otherBalances = allBalances.filter(b => b.coinType !== '0x2::sui::SUI')
  
  const metadataResults = await Promise.all(
    otherBalances.map(b => fetchMetadataWithTimeout(b.coinType))
  )

  for (let i = 0; i < otherBalances.length; i++) {
    const balance = otherBalances[i]
    const metadata = metadataResults[i]
    const decimals = metadata?.decimals ?? 9
    const symbol = metadata?.symbol ?? balance.coinType.split('::').pop() ?? 'Unknown'
    const rawBalance = Number(balance.totalBalance)
    const formattedBalance = (rawBalance / Math.pow(10, decimals)).toString()
    
    tokens.push({
      coinType: balance.coinType,
      totalBalance: balance.totalBalance,
      decimals,
      symbol,
      formattedBalance
    })
  }

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
