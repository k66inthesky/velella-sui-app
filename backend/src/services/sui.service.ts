import { SuiClient } from '@mysten/sui/client'

// 從環境變數讀取 RPC URL，fallback 到官方免費節點
const MAINNET_RPC_URL = process.env.SUI_MAINNET_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
const TESTNET_RPC_URL = process.env.SUI_TESTNET_RPC_URL || 'https://fullnode.testnet.sui.io:443'

// Mainnet client - 用於 UserStory 1-2 查詢錢包餘額
const mainnetClient = new SuiClient({ url: MAINNET_RPC_URL })

// Testnet client - 用於 UserStory 3 讀取 Object 資料
const testnetClient = new SuiClient({ url: TESTNET_RPC_URL })

// Log RPC URLs on startup (隱藏完整 URL 避免洩漏 API Key)
console.log(`📡 Mainnet RPC: ${MAINNET_RPC_URL.includes('fullnode.mainnet.sui.io') ? 'Official (Free)' : 'Custom RPC'}`)
console.log(`📡 Testnet RPC: ${TESTNET_RPC_URL.includes('fullnode.testnet.sui.io') ? 'Official (Free)' : 'Custom RPC'}`)

export interface BalanceInfo {
  coinType: string
  totalBalance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

export interface WalletBalanceResponse {
  address: string
  suiBalance: string
  tokens: BalanceInfo[]
}

export interface ObjectFieldsResponse {
  objectId: string
  fields: Record<string, unknown> | null
  error?: string
}

/**
 * 查詢錢包餘額 (Mainnet)
 */
export async function getWalletBalance(address: string): Promise<WalletBalanceResponse> {
  // 取得所有代幣餘額
  const allBalances = await mainnetClient.getAllBalances({ owner: address })
  
  // 分離 SUI 和其他代幣
  let suiBalance = '0'
  const tokens: BalanceInfo[] = []

  for (const balance of allBalances) {
    if (balance.coinType === '0x2::sui::SUI') {
      // 轉換為 SUI (除以 10^9)
      suiBalance = (Number(balance.totalBalance) / 1e9).toFixed(9)
    } else {
      // 查詢代幣的 metadata 取得 decimals
      try {
        const metadata = await mainnetClient.getCoinMetadata({ coinType: balance.coinType })
        const decimals = metadata?.decimals ?? 9
        const symbol = metadata?.symbol ?? 'Unknown'
        const rawBalance = Number(balance.totalBalance)
        const formattedBalance = (rawBalance / Math.pow(10, decimals)).toString()
        
        tokens.push({
          coinType: balance.coinType,
          totalBalance: balance.totalBalance,
          decimals,
          symbol,
          formattedBalance
        })
      } catch {
        // 如果無法取得 metadata，使用預設值
        tokens.push({
          coinType: balance.coinType,
          totalBalance: balance.totalBalance,
          decimals: 9,
          symbol: 'Unknown',
          formattedBalance: (Number(balance.totalBalance) / 1e9).toString()
        })
      }
    }
  }

  return {
    address,
    suiBalance,
    tokens
  }
}

/**
 * 檢查地址是否為有效的錢包地址（而非合約/Package 地址）
 * 透過查詢地址類型來判斷
 */
export async function isWalletAddress(address: string): Promise<{ 
  isWallet: boolean
  isPackage: boolean
  hasActivity: boolean
  error?: string 
}> {
  try {
    // 首先檢查這個地址是否為 Package（合約）
    try {
      const objectInfo = await mainnetClient.getObject({
        id: address,
        options: { showType: true, showContent: true }
      })
      
      if (objectInfo.data?.content?.dataType === 'package') {
        // 這是一個 Package（合約）地址，不是錢包
        return { isWallet: false, isPackage: true, hasActivity: false, error: 'This is a contract/package address, not a wallet address' }
      }
    } catch {
      // 查詢 object 失敗，可能是錢包地址（錢包地址本身不是 object）
    }
    
    // 嘗試取得該地址擁有的 objects 或餘額
    const [ownedObjects, balances] = await Promise.all([
      mainnetClient.getOwnedObjects({ owner: address, limit: 1 }),
      mainnetClient.getAllBalances({ owner: address }).catch(() => [])
    ])
    
    // 檢查是否有任何活動（擁有 objects 或有餘額）
    const hasActivity = (ownedObjects.data && ownedObjects.data.length > 0) || 
                        (Array.isArray(balances) && balances.length > 0)
    
    // 如果查詢成功（沒有拋出錯誤），這是一個有效的錢包地址
    // Sui 的設計是任何格式正確的地址都可以是錢包
    return { isWallet: true, isPackage: false, hasActivity }
  } catch (error) {
    // 如果查詢失敗，可能是無效的地址格式
    return { 
      isWallet: false,
      isPackage: false,
      hasActivity: false,
      error: error instanceof Error ? error.message : 'Invalid address'
    }
  }
}

/**
 * 讀取 Object 資料 (Testnet)
 */
export async function getObjectFields(objectId: string): Promise<ObjectFieldsResponse> {
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
