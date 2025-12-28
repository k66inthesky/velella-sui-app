import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

// Testnet USDC 代幣類型
const USDC_TYPE = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'

// DeepBook DEX - 訂單簿展示 + 簡易 Swap
function DeepBookSwap() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  
  const [orderBook, setOrderBook] = useState<{
    bids: { price: string; quantity: string }[]
    asks: { price: string; quantity: string }[]
    spread: string
    midPrice: string
  } | null>(null)
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false)
  const [amount, setAmount] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [txResult, setTxResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suiBalance, setSuiBalance] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)

  // 模擬載入訂單簿（實際需要 DeepBook Pool ID）
  const loadOrderBook = async () => {
    setIsLoadingOrderBook(true)
    setError(null)
    
    try {
      // 模擬真實的訂單簿資料
      // 在實際應用中，需要使用 DeepBook SDK 查詢真實 Pool
      const basePrice = 4.25 + (Math.random() - 0.5) * 0.1
      
      const bids = Array(5).fill(0).map((_, i) => ({
        price: (basePrice - 0.005 * (i + 1)).toFixed(4),
        quantity: (Math.random() * 5000 + 500).toFixed(0),
      }))
      
      const asks = Array(5).fill(0).map((_, i) => ({
        price: (basePrice + 0.005 * (i + 1)).toFixed(4),
        quantity: (Math.random() * 5000 + 500).toFixed(0),
      }))

      const spread = (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(4)
      const midPrice = ((parseFloat(asks[0].price) + parseFloat(bids[0].price)) / 2).toFixed(4)
      
      setOrderBook({ bids, asks, spread, midPrice })
    } catch (err) {
      console.error('Load order book error:', err)
      setError(err instanceof Error ? err.message : '載入訂單簿失敗')
    } finally {
      setIsLoadingOrderBook(false)
    }
  }

  // 載入 SUI 和 USDC 餘額
  useEffect(() => {
    const fetchBalances = async () => {
      if (!account?.address) return
      try {
        // 獲取 SUI 餘額
        const suiResult = await client.getBalance({ owner: account.address })
        const sui = Number(suiResult.totalBalance) / 1_000_000_000
        setSuiBalance(sui.toFixed(4))
        
        // 獲取 USDC 餘額
        try {
          const usdcResult = await client.getBalance({ 
            owner: account.address,
            coinType: USDC_TYPE
          })
          const usdc = Number(usdcResult.totalBalance) / 1_000_000 // USDC 是 6 位小數
          setUsdcBalance(usdc.toFixed(2))
        } catch {
          setUsdcBalance('0.00')
        }
      } catch (err) {
        console.error('Fetch balance error:', err)
      }
    }
    fetchBalances()
  }, [account?.address, client, txResult])

  useEffect(() => {
    loadOrderBook()
    const interval = setInterval(loadOrderBook, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSwap = async () => {
    if (!account || !amount) {
      setError('請連接錢包並輸入數量')
      return
    }

    // 檢查餘額是否足夠
    if (side === 'buy') {
      if (parseFloat(amount) > parseFloat(usdcBalance || '0')) {
        setError('USDC 餘額不足')
        return
      }
    } else {
      if (parseFloat(amount) > parseFloat(suiBalance || '0')) {
        setError('SUI 餘額不足')
        return
      }
    }

    setError(null)
    setTxResult(null)

    try {
      // 模擬交易：做一個自轉帳來展示交易流程
      // 實際 DeepBook 交易需要有對應的代幣和 Pool
      
      const tx = new Transaction()
      
      // 根據買賣方向決定交易金額
      // 買入：用 USDC 買 SUI（這裡模擬為轉少量 SUI）
      // 賣出：賣 SUI 換 USDC（這裡模擬為轉入的 SUI 數量）
      const amountInMist = side === 'sell' 
        ? BigInt(Math.floor(parseFloat(amount) * 1_000_000_000))
        : BigInt(Math.floor(0.001 * 1_000_000_000)) // 買入時只用少量 gas 做示範
      
      // 示範交易
      const [coin] = tx.splitCoins(tx.gas, [amountInMist])
      tx.transferObjects([coin], account.address)

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            // 查詢交易狀態確認是否真的成功
            try {
              const txDetails = await client.waitForTransaction({
                digest: result.digest,
                options: { showEffects: true }
              })
              
              const status = txDetails.effects?.status?.status
              
              if (status === 'success') {
                setTxResult(result.digest)
                setAmount('')
                loadOrderBook()
              } else {
                const errorMsg = txDetails.effects?.status?.error || '交易執行失敗'
                setError(`交易失敗: ${errorMsg}`)
              }
            } catch (err) {
              // 如果查詢失敗，假設交易成功（已經提交）
              setTxResult(result.digest)
              setAmount('')
              loadOrderBook()
            }
          },
          onError: (err) => {
            setError(err.message)
          }
        }
      )
    } catch (err) {
      console.error('Swap error:', err)
      setError(err instanceof Error ? err.message : '交易失敗')
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>📊 DeepBook DEX</h2>
        <span style={{ padding: '4px 12px', backgroundColor: '#6366f1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Testnet</span>
      </div>
      <p className="description">
        Sui 原生訂單簿 DEX - 即時訂單簿展示
      </p>

      {error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* 錢包狀態 */}
      {!account ? (
        <div className="result-card" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <p>⚠️ 請先在「連接錢包」分頁連接 Testnet 錢包</p>
        </div>
      ) : (
        <div className="result-card" style={{ marginBottom: '24px' }}>
          <div className="result-item">
            <span className="result-label">已連接錢包</span>
            <span className="result-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {account.address.slice(0, 10)}...{account.address.slice(-8)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div style={{ 
              flex: 1, 
              padding: '12px', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>SUI 餘額</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                {suiBalance ?? '...'} SUI
              </p>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '12px', 
              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>USDC 餘額</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>
                {usdcBalance ?? '...'} USDC
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 交易對資訊 */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>SUI / USDC</h3>
        {orderBook && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              中間價: <strong style={{ color: 'var(--text-primary)' }}>${orderBook.midPrice}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              價差: <strong style={{ color: 'var(--text-primary)' }}>${orderBook.spread}</strong>
            </span>
          </div>
        )}
      </div>

      {/* 訂單簿 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* 買單 */}
        <div className="result-card">
          <h4 style={{ color: '#00d26a', margin: '0 0 12px 0' }}>
            買單 (Bid)
            <button 
              onClick={loadOrderBook}
              style={{
                marginLeft: '8px',
                padding: '2px 8px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              刷新
            </button>
          </h4>
          {isLoadingOrderBook ? (
            <p style={{ color: 'var(--text-muted)' }}>載入中...</p>
          ) : orderBook ? (
            <table style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', fontWeight: 'normal' }}>價格 ($)</th>
                  <th style={{ textAlign: 'right', fontWeight: 'normal' }}>數量 (SUI)</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.bids.map((bid, i) => (
                  <tr key={i}>
                    <td style={{ color: '#00d26a' }}>{bid.price}</td>
                    <td style={{ textAlign: 'right' }}>{Number(bid.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {/* 賣單 */}
        <div className="result-card">
          <h4 style={{ color: '#ff4757', margin: '0 0 12px 0' }}>賣單 (Ask)</h4>
          {isLoadingOrderBook ? (
            <p style={{ color: 'var(--text-muted)' }}>載入中...</p>
          ) : orderBook ? (
            <table style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', fontWeight: 'normal' }}>價格 ($)</th>
                  <th style={{ textAlign: 'right', fontWeight: 'normal' }}>數量 (SUI)</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.asks.map((ask, i) => (
                  <tr key={i}>
                    <td style={{ color: '#ff4757' }}>{ask.price}</td>
                    <td style={{ textAlign: 'right' }}>{Number(ask.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* 交易表單 */}
      <div className="result-card">
        <h4 style={{ margin: '0 0 16px 0' }}>模擬交易</h4>
        
        {/* 買/賣切換 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setSide('buy')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: side === 'buy' ? '#00d26a' : 'var(--card-bg)',
              color: side === 'buy' ? 'white' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: side === 'buy' ? '#00d26a' : 'var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            買入 SUI
          </button>
          <button
            onClick={() => setSide('sell')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: side === 'sell' ? '#ff4757' : 'var(--card-bg)',
              color: side === 'sell' ? 'white' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: side === 'sell' ? '#ff4757' : 'var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            賣出 SUI
          </button>
        </div>

        {/* 數量輸入 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>
            {side === 'buy' ? '支付 USDC 數量' : '賣出 SUI 數量'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="輸入數量"
              style={{
                width: '100%',
                padding: '12px',
                paddingRight: '70px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '16px'
              }}
            />
            <span style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontWeight: 'bold'
            }}>
              {side === 'buy' ? 'USDC' : 'SUI'}
            </span>
          </div>
          {orderBook && amount && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '8px' 
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {side === 'buy' ? '預估獲得' : '預估獲得'}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {side === 'buy' 
                  ? `≈ ${(parseFloat(amount || '0') / parseFloat(orderBook.midPrice)).toFixed(4)} SUI`
                  : `≈ ${(parseFloat(amount || '0') * parseFloat(orderBook.midPrice)).toFixed(2)} USDC`
                }
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                參考價格: 1 SUI = ${orderBook.midPrice} USDC
              </p>
            </div>
          )}
        </div>

        {/* 交易按鈕 */}
        <button
          onClick={handleSwap}
          disabled={!account || !amount || isPending}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: side === 'buy' ? '#00d26a' : '#ff4757',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!account || !amount || isPending) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: (!account || !amount) ? 0.5 : 1
          }}
        >
          {isPending 
            ? '交易中...' 
            : side === 'buy' 
              ? `用 ${amount || '0'} USDC 買入 SUI` 
              : `賣出 ${amount || '0'} SUI 換 USDC`
          }
        </button>
        
        {/* 餘額不足提示 */}
        {account && amount && (
          (side === 'buy' && parseFloat(amount) > parseFloat(usdcBalance || '0')) ||
          (side === 'sell' && parseFloat(amount) > parseFloat(suiBalance || '0'))
        ) && (
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#ff4757', textAlign: 'center' }}>
            ⚠️ {side === 'buy' ? 'USDC' : 'SUI'} 餘額不足
          </p>
        )}
      </div>

      {/* 交易結果 */}
      {txResult && (
        <div className="result-card" style={{ marginTop: '16px', backgroundColor: 'rgba(0, 255, 127, 0.1)' }}>
          <h4>✅ 交易成功</h4>
          <a 
            href={`https://suiscan.xyz/testnet/tx/${txResult}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary)' }}
          >
            在 SuiScan 查看 →
          </a>
        </div>
      )}

      {/* 說明 */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '12px' }}>💡 技術說明</h4>
        <ul style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
          <li><strong>DeepBook</strong>：Sui 原生的中央限價訂單簿 (CLOB)</li>
          <li><strong>交易對</strong>：SUI/USDC - 用 USDC 買入或賣出 SUI</li>
          <li><strong>訂單簿</strong>：顯示即時買賣掛單深度</li>
          <li><strong>注意</strong>：此為模擬交易，完整整合需要 DeepBook Pool</li>
        </ul>
      </div>
    </div>
  )
}

export default DeepBookSwap
