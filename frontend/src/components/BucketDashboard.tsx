import { useState, useEffect } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { BucketClient } from '@bucket-protocol/sdk'

// Bucket Protocol 儀表板 - 查詢 Vault、Position、PSM 資訊
function BucketDashboard() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  
  const [vaults, setVaults] = useState<Record<string, any> | null>(null)
  const [positions, setPositions] = useState<any[] | null>(null)
  const [psmPools, setPsmPools] = useState<Record<string, any> | null>(null)
  const [prices, setPrices] = useState<Record<string, number> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'vaults' | 'positions' | 'psm' | 'prices'>('vaults')

  // 初始化 Bucket Client (mainnet)
  const bucketClient = new BucketClient({ 
    suiClient: suiClient as any,
    network: 'mainnet' 
  })

  // 載入 Vault 資訊
  const loadVaults = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const vaultData = await bucketClient.getAllVaultObjects()
      setVaults(vaultData)
    } catch (err) {
      console.error('Load vaults error:', err)
      setError('載入 Vault 資訊失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 載入用戶 Position
  const loadPositions = async () => {
    if (!account?.address) {
      setError('請先連接錢包')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const positionData = await bucketClient.getUserPositions({
        address: account.address
      })
      setPositions(positionData)
    } catch (err) {
      console.error('Load positions error:', err)
      setError('載入 Position 資訊失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 載入 PSM Pool 資訊
  const loadPsmPools = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const psmData = await bucketClient.getAllPsmPoolObjects()
      setPsmPools(psmData)
    } catch (err) {
      console.error('Load PSM pools error:', err)
      setError('載入 PSM Pool 資訊失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 載入 Oracle 價格
  const loadPrices = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const priceData = await bucketClient.getAllOraclePrices()
      setPrices(priceData)
    } catch (err) {
      console.error('Load prices error:', err)
      setError('載入價格資訊失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadVaults()
  }, [])

  // 切換 tab 時載入對應資料
  useEffect(() => {
    if (activeTab === 'vaults' && !vaults) loadVaults()
    if (activeTab === 'positions' && account?.address && !positions) loadPositions()
    if (activeTab === 'psm' && !psmPools) loadPsmPools()
    if (activeTab === 'prices' && !prices) loadPrices()
  }, [activeTab, account?.address])

  // 格式化數字
  const formatNumber = (value: bigint | number, decimals: number = 6) => {
    const num = typeof value === 'bigint' ? Number(value) / Math.pow(10, decimals) : value
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }

  // 格式化百分比
  const formatPercent = (value: number) => {
    return (value * 100).toFixed(2) + '%'
  }

  // 縮短地址/類型
  const shortenType = (type: string) => {
    const parts = type.split('::')
    return parts.length > 2 ? parts[parts.length - 1] : type.slice(0, 20) + '...'
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>🪣 Bucket Protocol</h2>
        <span style={{ padding: '4px 12px', backgroundColor: '#10b981', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Mainnet</span>
      </div>
      <p className="description">
        Sui 原生 CDP 穩定幣協議 - 抵押資產借出 USDB
      </p>

      {error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tab 導航 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'vaults', label: '🏦 Vaults', desc: '抵押池' },
          { key: 'positions', label: '📊 Positions', desc: '我的倉位' },
          { key: 'psm', label: '💱 PSM', desc: '穩定幣兌換' },
          { key: 'prices', label: '📈 Prices', desc: 'Oracle 價格' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: '1 1 120px',
              padding: '12px 16px',
              backgroundColor: activeTab === tab.key ? 'var(--primary)' : 'var(--card-bg)',
              color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: activeTab === tab.key ? 'var(--primary)' : 'var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            <div>{tab.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* 載入中 */}
      {isLoading && (
        <div className="result-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>⏳ 載入中...</p>
        </div>
      )}

      {/* Vaults Tab */}
      {activeTab === 'vaults' && !isLoading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>抵押池資訊</h3>
            <button 
              onClick={loadVaults}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              刷新
            </button>
          </div>
          
          {vaults && Object.entries(vaults).length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(vaults).map(([coinType, vault]: [string, any]) => (
                <div key={coinType} className="result-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>
                      {shortenType(coinType)}
                    </h4>
                    <span style={{ 
                      padding: '4px 8px', 
                      backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#10b981'
                    }}>
                      MCR: {formatPercent(vault.minCollateralRatio || 1.1)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>總抵押</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatNumber(vault.collateralBalance || 0n, vault.collateralDecimal || 9)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>USDB 供應</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatNumber(vault.usdbSupply || 0n, 6)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>利率</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatPercent(vault.interestRate || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>倉位數</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {vault.positionTableSize || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="result-card" style={{ textAlign: 'center' }}>
              <p>暫無 Vault 資訊</p>
            </div>
          )}
        </div>
      )}

      {/* Positions Tab */}
      {activeTab === 'positions' && !isLoading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>我的倉位</h3>
            <button 
              onClick={loadPositions}
              disabled={!account?.address}
              style={{
                padding: '8px 16px',
                backgroundColor: account?.address ? 'var(--primary)' : 'var(--border)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: account?.address ? 'pointer' : 'not-allowed'
              }}
            >
              刷新
            </button>
          </div>

          {!account?.address ? (
            <div className="result-card" style={{ textAlign: 'center' }}>
              <p>⚠️ 請先在「連接錢包」分頁連接 Mainnet 錢包</p>
            </div>
          ) : positions && positions.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {positions.map((pos: any, index: number) => (
                <div key={index} className="result-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>
                      {shortenType(pos.collateralType)}
                    </h4>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>抵押品</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {formatNumber(pos.collateralAmount || 0n, 9)}
                      </div>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>債務 (USDB)</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                        {formatNumber(pos.debtAmount || 0n, 6)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="result-card" style={{ textAlign: 'center' }}>
              <p>您目前沒有任何倉位</p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                前往 <a href="https://app.bucketprotocol.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Bucket Protocol</a> 開設倉位
              </p>
            </div>
          )}
        </div>
      )}

      {/* PSM Tab */}
      {activeTab === 'psm' && !isLoading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>PSM 穩定幣兌換池</h3>
            <button 
              onClick={loadPsmPools}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              刷新
            </button>
          </div>

          {psmPools && Object.entries(psmPools).length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(psmPools).map(([coinType, pool]: [string, any]) => (
                <div key={coinType} className="result-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#10b981' }}>
                      {shortenType(coinType)}
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', fontSize: '11px' }}>
                        Swap In: {formatPercent(pool.feeRate?.swapIn || 0)}
                      </span>
                      <span style={{ padding: '4px 8px', backgroundColor: 'rgba(168, 85, 247, 0.2)', borderRadius: '4px', fontSize: '11px' }}>
                        Swap Out: {formatPercent(pool.feeRate?.swapOut || 0)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>池子餘額</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatNumber(pool.balance || 0n, pool.decimal || 6)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>USDB 供應</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatNumber(pool.usdbSupply || 0n, 6)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="result-card" style={{ textAlign: 'center' }}>
              <p>暫無 PSM Pool 資訊</p>
            </div>
          )}
        </div>
      )}

      {/* Prices Tab */}
      {activeTab === 'prices' && !isLoading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Oracle 價格</h3>
            <button 
              onClick={loadPrices}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              刷新
            </button>
          </div>

          {prices && Object.entries(prices).length > 0 ? (
            <div className="result-card">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 'normal' }}>資產</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 'normal' }}>價格 (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(prices).map(([coinType, price]: [string, number]) => (
                    <tr key={coinType} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontWeight: 'bold' }}>{shortenType(coinType)}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 8px', fontFamily: 'monospace', color: '#10b981' }}>
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="result-card" style={{ textAlign: 'center' }}>
              <p>暫無價格資訊</p>
            </div>
          )}
        </div>
      )}

      {/* 說明 */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '12px' }}>💡 Bucket Protocol 說明</h4>
        <ul style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
          <li><strong>CDP</strong>：抵押資產（SUI、BTC 等）借出 USDB 穩定幣</li>
          <li><strong>USDB</strong>：Bucket 的原生穩定幣，與美元 1:1 錨定</li>
          <li><strong>PSM</strong>：穩定幣之間的兌換（USDC、USDT ↔ USDB）</li>
          <li><strong>MCR</strong>：最低抵押率，低於此值可能被清算</li>
          <li><strong>官網</strong>：<a href="https://app.bucketprotocol.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>app.bucketprotocol.io</a></li>
        </ul>
      </div>
    </div>
  )
}

export default BucketDashboard
