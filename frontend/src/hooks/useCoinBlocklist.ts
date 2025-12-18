import { useState, useEffect, useCallback } from 'react'

const BLOCKLIST_URL = 'https://raw.githubusercontent.com/MystenLabs/wallet_blocklist/main/blocklists/coin-list.json'
const ALLOWLIST_URL = 'https://raw.githubusercontent.com/MystenLabs/wallet_blocklist/main/allowlists/coin-list.json'
const PACKAGE_BLOCKLIST_URL = 'https://raw.githubusercontent.com/MystenLabs/wallet_blocklist/main/blocklists/package-list.json'

export type CoinStatus = 'verified' | 'scam' | 'unknown'

// 全域快取（避免重複請求）
let globalBlocklist: Set<string> | null = null
let globalAllowlist: Set<string> | null = null
let globalPackageBlocklist: Set<string> | null = null
let fetchPromise: Promise<void> | null = null

// 預先載入所有 blocklist
async function loadLists(): Promise<{ 
  blocklist: Set<string>
  allowlist: Set<string>
  packageBlocklist: Set<string>
}> {
  if (globalBlocklist && globalAllowlist && globalPackageBlocklist) {
    return { 
      blocklist: globalBlocklist, 
      allowlist: globalAllowlist,
      packageBlocklist: globalPackageBlocklist
    }
  }

  if (fetchPromise) {
    await fetchPromise
    return { 
      blocklist: globalBlocklist!, 
      allowlist: globalAllowlist!,
      packageBlocklist: globalPackageBlocklist!
    }
  }

  fetchPromise = (async () => {
    try {
      const [blocklistRes, allowlistRes, packageBlocklistRes] = await Promise.all([
        fetch(BLOCKLIST_URL),
        fetch(ALLOWLIST_URL),
        fetch(PACKAGE_BLOCKLIST_URL)
      ])

      if (!blocklistRes.ok || !allowlistRes.ok || !packageBlocklistRes.ok) {
        throw new Error(`Failed to fetch coin lists: ${blocklistRes.status}, ${allowlistRes.status}, ${packageBlocklistRes.status}`)
      }

      const blocklistJson = await blocklistRes.json()
      const allowlistJson = await allowlistRes.json()
      const packageBlocklistJson = await packageBlocklistRes.json()

      // MystenLabs 的 JSON 格式是 { "blocklist": [...] } 或 { "allowlist": [...] }
      // 需要提取陣列
      const blocklistData = blocklistJson.blocklist || blocklistJson
      const allowlistData = allowlistJson.allowlist || allowlistJson
      const packageBlocklistData = packageBlocklistJson.blocklist || packageBlocklistJson

      // 確保資料是陣列
      if (!Array.isArray(blocklistData) || !Array.isArray(allowlistData) || !Array.isArray(packageBlocklistData)) {
        console.error('[Blocklist] Invalid data format:', { 
          blocklistIsArray: Array.isArray(blocklistData),
          allowlistIsArray: Array.isArray(allowlistData),
          packageBlocklistIsArray: Array.isArray(packageBlocklistData),
          blocklistKeys: Object.keys(blocklistJson),
          allowlistKeys: Object.keys(allowlistJson)
        })
        throw new Error('Invalid blocklist data format')
      }

      // 將所有 coinType 正規化為全小寫
      globalBlocklist = new Set(blocklistData.map((s: string) => s.toLowerCase()))
      globalAllowlist = new Set(allowlistData.map((s: string) => s.toLowerCase()))
      globalPackageBlocklist = new Set(packageBlocklistData.map((s: string) => s.toLowerCase()))
      
      console.log('[Blocklist Loaded]', { 
        blocklistSize: globalBlocklist.size, 
        allowlistSize: globalAllowlist.size,
        packageBlocklistSize: globalPackageBlocklist.size
      })
    } catch (err) {
      console.error('Error fetching coin blocklist:', err)
      globalBlocklist = new Set()
      globalAllowlist = new Set()
      globalPackageBlocklist = new Set()
    }
  })()

  await fetchPromise
  return { 
    blocklist: globalBlocklist!, 
    allowlist: globalAllowlist!,
    packageBlocklist: globalPackageBlocklist!
  }
}

// 在模組載入時就開始預先載入
loadLists()

export function useCoinBlocklist() {
  const [blocklist, setBlocklist] = useState<Set<string>>(globalBlocklist || new Set())
  const [allowlist, setAllowlist] = useState<Set<string>>(globalAllowlist || new Set())
  const [packageBlocklist, setPackageBlocklist] = useState<Set<string>>(globalPackageBlocklist || new Set())
  const [loading, setLoading] = useState(!globalBlocklist)

  useEffect(() => {
    if (globalBlocklist && globalAllowlist && globalPackageBlocklist) {
      setBlocklist(globalBlocklist)
      setAllowlist(globalAllowlist)
      setPackageBlocklist(globalPackageBlocklist)
      setLoading(false)
      return
    }

    loadLists().then(({ blocklist, allowlist, packageBlocklist }) => {
      setBlocklist(blocklist)
      setAllowlist(allowlist)
      setPackageBlocklist(packageBlocklist)
      setLoading(false)
    })
  }, [])

  const getCoinStatus = useCallback((coinType: string): CoinStatus => {
    // 正規化 coinType：轉為全小寫
    const normalized = coinType.toLowerCase()
    
    // 使用全域快取（確保即時性）
    const bl = globalBlocklist || blocklist
    const al = globalAllowlist || allowlist
    
    const isInBlocklist = bl.has(normalized)
    const isInAllowlist = al.has(normalized)
    
    console.log('[getCoinStatus]', {
      coinType,
      normalized,
      blocklistSize: bl.size,
      allowlistSize: al.size,
      isInBlocklist,
      isInAllowlist
    })
    
    if (isInBlocklist) {
      return 'scam'
    }
    if (isInAllowlist) {
      return 'verified'
    }
    return 'unknown'
  }, [blocklist, allowlist])

  // 檢查地址是否為 scam package
  const isScamPackage = useCallback((address: string): boolean => {
    const normalized = address.toLowerCase()
    const pl = globalPackageBlocklist || packageBlocklist
    return pl.has(normalized)
  }, [packageBlocklist])

  const getStatusDisplay = useCallback((status: CoinStatus): { emoji: string; label: string; color: string } => {
    switch (status) {
      case 'scam':
        return { emoji: '😈', label: 'scam', color: '#e74c3c' }
      case 'verified':
        return { emoji: '😇', label: 'verified', color: '#27ae60' }
      case 'unknown':
      default:
        return { emoji: '🤔', label: 'unknown', color: '#f39c12' }
    }
  }, [])

  return {
    loading,
    getCoinStatus,
    getStatusDisplay,
    isScamPackage,
    blocklistCount: blocklist.size,
    allowlistCount: allowlist.size,
    packageBlocklistCount: packageBlocklist.size
  }
}
