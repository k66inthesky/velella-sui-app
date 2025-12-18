import { useState } from 'react'
import axios from 'axios'
import { useCoinBlocklist } from '../hooks/useCoinBlocklist'

interface BalanceInfo {
  coinType: string
  totalBalance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

interface WalletBalanceResponse {
  address: string
  suiBalance: string
  tokens: BalanceInfo[]
}

interface AddressValidationResponse {
  valid: boolean
  address?: string
  isWallet: boolean
  isPackage: boolean
  hasActivity: boolean
  error?: string
}

/**
 * 驗證 Sui 地址格式
 * Sui 錢包地址格式: 0x + 64 個十六進位字元
 */
function isValidSuiAddress(address: string): boolean {
  // 必須是 0x 開頭 + 64 個十六進位字元 = 共 66 字元
  const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/
  return suiAddressRegex.test(address)
}

function AddressQuery() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WalletBalanceResponse | null>(null)
  
  const { getCoinStatus, getStatusDisplay, isScamPackage, loading: listLoading } = useCoinBlocklist()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address.trim()) {
      setError('請輸入錢包地址')
      return
    }

    if (!address.startsWith('0x')) {
      setError('地址格式錯誤，應以 0x 開頭')
      return
    }

    // 驗證是否為有效的 Sui 錢包地址格式
    if (!isValidSuiAddress(address)) {
      setError('請輸入有效的 Sui 錢包地址 (0x + 64 個十六進位字元)')
      return
    }

    // 檢查是否為已知的 scam package 地址
    if (isScamPackage(address)) {
      setError('⚠️ 此地址為已知的詐騙合約地址，請輸入錢包地址')
      return
    }

    setLoading(true)
    setError(null)
    setData(null)

    try {
      // 先驗證地址是否為有效的錢包地址
      const validateResponse = await axios.get<AddressValidationResponse>(
        `/api/wallet/${address}/validate`
      )
      
      const validation = validateResponse.data
      
      // 檢查是否為合約地址
      if (validation.isPackage) {
        setError('⚠️ 此地址是合約/Package 地址，不是錢包地址')
        setLoading(false)
        return
      }
      
      // 檢查是否為有效的錢包地址
      if (!validation.isWallet) {
        setError(validation.error || '此地址不是有效的錢包地址')
        setLoading(false)
        return
      }

      // 檢查地址是否有鏈上活動記錄（從未使用過的地址視為無效）
      if (!validation.hasActivity) {
        setError('⚠️ 此地址在鏈上沒有任何活動記錄，可能不是有效的錢包地址')
        setLoading(false)
        return
      }

      // 驗證通過，查詢餘額
      const response = await axios.get<WalletBalanceResponse>(
        `/api/wallet/${address}/balance`
      )
      setData(response.data)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data
        if (errorData?.isPackage) {
          setError('⚠️ 此地址是合約/Package 地址，不是錢包地址')
        } else {
          setError(errorData?.error || errorData?.message || err.message)
        }
      } else {
        setError('查詢失敗，請稍後再試')
      }
    } finally {
      setLoading(false)
    }
  }

  // 格式化代幣數量（使用後端回傳的 formattedBalance）
  const formatTokenAmount = (token: BalanceInfo) => {
    const num = Number(token.formattedBalance)
    return num.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }

  // 格式化代幣名稱
  const formatTokenName = (token: BalanceInfo) => {
    return `${token.symbol} (${token.coinType.slice(0, 20)}...)`
  }

  return (
    <div className="section">
      <h2 className="section-title">🔍 UserStory 1-2：查詢錢包地址 (Mainnet)</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="address">錢包地址</label>
          <input
            id="address"
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? '查詢中...' : '查詢餘額'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {data && (
        <div className="wallet-info-card">
          <div className="info-row">
            <span className="info-label">🏦 錢包地址</span>
            <span className="info-value">{data.address}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">💰 SUI 餘額</span>
            <span className="info-value balance-value">
              {data.suiBalance} SUI
            </span>
          </div>

          {data.tokens.length > 0 && (
            <>
              <h4 style={{ marginTop: '16px', marginBottom: '12px' }}>
                🪙 其他代幣 ({data.tokens.length})
              </h4>
              
              {/* 黑白名單來源說明 */}
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#666', 
                marginBottom: '12px',
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '6px'
              }}>
                {listLoading ? (
                  '⏳ 正在載入代幣驗證清單...'
                ) : (
                  <>
                    📋 代幣驗證狀態從{' '}
                    <a 
                      href="https://github.com/MystenLabs/wallet_blocklist" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#4a90d9' }}
                    >
                      MystenLabs/wallet_blocklist
                    </a>
                    {' '}動態抓取，可能受限於 GitHub 的 Rate Limit
                  </>
                )}
              </div>

              <div className="token-list">
                {data.tokens.map((token, index) => {
                  const status = getCoinStatus(token.coinType)
                  const statusDisplay = getStatusDisplay(status)
                  
                  // 除錯訊息
                  console.log('[Token Check]', {
                    coinType: token.coinType,
                    normalizedCoinType: token.coinType.toLowerCase(),
                    status,
                    listLoading
                  })
                  
                  return (
                    <div key={index} className="token-item">
                      <div className="token-info">
                        <span className="token-type">
                          {formatTokenName(token)}
                        </span>
                        <span 
                          className="token-status"
                          style={{ 
                            color: statusDisplay.color,
                            fontSize: '0.85rem',
                            marginLeft: '8px'
                          }}
                          title={`Status: ${statusDisplay.label}`}
                        >
                          {statusDisplay.emoji} {statusDisplay.label}
                        </span>
                      </div>
                      <span className="token-amount">
                        {formatTokenAmount(token)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {data.tokens.length === 0 && (
            <div style={{ marginTop: '12px', color: '#999' }}>
              此地址沒有其他代幣
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AddressQuery
