import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { bcs } from '@mysten/sui/bcs'

// DeepBook Testnet 配置
// 使用 SDK 官方 testnet package ID
const DEEPBOOK_PACKAGE_ID = '0xb48d47cb5f56d0f489f48f186d06672df59d64bd2f514b2f0ba40cbb8c8fd487'

// Testnet Pools
const POOL_DEEP_SUI = '0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f'

// Testnet 代幣類型
const SUI_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
const DEEP_TYPE = '0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP'

// 小數位
const SUI_SCALAR = 1e9
const DEEP_SCALAR = 1e6

// Pool 參數 (從鏈上 pool 對象讀取)
const MIN_SIZE = 10 // 最小訂單大小: 10 DEEP
// LOT_SIZE = 1 DEEP (最小交易單位)

// DeepBook DEX - DEEP/SUI 交易對（只需要 SUI 就能交易）
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
  const [deepBalance, setDeepBalance] = useState<string | null>(null)

  // 載入真實訂單簿（從鏈上查詢）
  const loadOrderBook = async () => {
    setIsLoadingOrderBook(true)
    
    try {
      const tx = new Transaction()
      
      // 查詢真實的 order book
      tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::pool::get_level2_ticks_from_mid`,
        arguments: [
          tx.object(POOL_DEEP_SUI),
          tx.pure.u64(5), // 5 ticks from mid
          tx.object('0x6')
        ],
        typeArguments: [DEEP_TYPE, SUI_TYPE]
      })
      
      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000'
      })
      
      if (result.results?.[0]?.returnValues) {
        const returnValues = result.results[0].returnValues
        const VecU64 = bcs.vector(bcs.u64())
        const FLOAT_SCALAR = 1e9
        
        const bidPricesRaw = VecU64.parse(new Uint8Array(returnValues[0][0]))
        const bidQtysRaw = VecU64.parse(new Uint8Array(returnValues[1][0]))
        const askPricesRaw = VecU64.parse(new Uint8Array(returnValues[2][0]))
        const askQtysRaw = VecU64.parse(new Uint8Array(returnValues[3][0]))
        
        // 轉換價格: raw_price * baseCoin.scalar / quoteCoin.scalar / FLOAT_SCALAR
        // baseCoin = DEEP (1e6), quoteCoin = SUI (1e9)
        const bids = bidPricesRaw.slice(0, 5).map((p, i) => ({
          price: (Number(p) * DEEP_SCALAR / SUI_SCALAR / FLOAT_SCALAR).toFixed(4),
          quantity: (Number(bidQtysRaw[i]) / DEEP_SCALAR).toFixed(0)
        }))
        
        const asks = askPricesRaw.slice(0, 5).map((p, i) => ({
          price: (Number(p) * DEEP_SCALAR / SUI_SCALAR / FLOAT_SCALAR).toFixed(4),
          quantity: (Number(askQtysRaw[i]) / DEEP_SCALAR).toFixed(0)
        }))
        
        const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0
        const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0
        const spread = (bestAsk - bestBid).toFixed(4)
        const midPrice = ((bestAsk + bestBid) / 2).toFixed(4)
        
        setOrderBook({ bids, asks, spread, midPrice })
      } else {
        // 如果查詢失敗，使用備用價格
        setOrderBook({
          bids: [{ price: '0.679', quantity: '10' }],
          asks: [{ price: '0.681', quantity: '10' }],
          spread: '0.002',
          midPrice: '0.680'
        })
      }
    } catch (err) {
      console.error('Load order book error:', err)
      // 備用價格
      setOrderBook({
        bids: [{ price: '0.679', quantity: '10' }],
        asks: [{ price: '0.681', quantity: '10' }],
        spread: '0.002',
        midPrice: '0.680'
      })
    } finally {
      setIsLoadingOrderBook(false)
    }
  }

  // 載入餘額
  useEffect(() => {
    const fetchBalances = async () => {
      if (!account?.address) return
      try {
        // SUI 餘額
        const suiResult = await client.getBalance({ owner: account.address })
        setSuiBalance((Number(suiResult.totalBalance) / SUI_SCALAR).toFixed(4))
        
        // DEEP 餘額
        try {
          const deepResult = await client.getBalance({ 
            owner: account.address,
            coinType: DEEP_TYPE
          })
          setDeepBalance((Number(deepResult.totalBalance) / DEEP_SCALAR).toFixed(2))
        } catch {
          setDeepBalance('0.00')
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

  // 真實 Swap 交易
  const handleSwap = async () => {
    if (!account || !amount) {
      setError('請連接錢包並輸入數量')
      return
    }

    const inputAmount = parseFloat(amount)
    if (isNaN(inputAmount) || inputAmount <= 0) {
      setError('請輸入有效數量')
      return
    }

    // 根據當前價格計算預估獲得的 DEEP 數量
    const currentPrice = orderBook?.asks?.[0]?.price ? parseFloat(orderBook.asks[0].price) : 0.68
    const estimatedDeep = side === 'buy' ? inputAmount / currentPrice : inputAmount

    // DeepBook min_size 檢查：必須交易至少 10 DEEP
    if (side === 'buy') {
      if (estimatedDeep < MIN_SIZE) {
        const minSuiNeeded = MIN_SIZE * currentPrice + 0.5 // 加上一點 buffer
        setError(`最小交易量為 ${MIN_SIZE} DEEP（約 ${minSuiNeeded.toFixed(1)} SUI）。您輸入的 ${inputAmount} SUI 只能買約 ${estimatedDeep.toFixed(1)} DEEP`)
        return
      }
    } else {
      if (inputAmount < MIN_SIZE) {
        setError(`最小交易量為 ${MIN_SIZE} DEEP`)
        return
      }
    }

    // 檢查餘額（買 DEEP 需要額外預留 gas 費用）
    if (side === 'buy') {
      const totalNeeded = inputAmount + 0.05 // 交易金額 + gas
      if (totalNeeded > parseFloat(suiBalance || '0')) {
        setError(`SUI 餘額不足。需要約 ${totalNeeded.toFixed(2)} SUI（含 gas）`)
        return
      }
    } else {
      // 賣 DEEP：需要 DEEP
      if (inputAmount > parseFloat(deepBalance || '0')) {
        setError('DEEP 餘額不足')
        return
      }
    }

    setError(null)
    setTxResult(null)

    try {
      const tx = new Transaction()
      tx.setGasBudget(50000000) // 0.05 SUI gas budget

      if (side === 'buy') {
        // 用 SUI 買 DEEP (使用 swap_exact_quantity)
        // DEEP_SUI 池: base=DEEP, quote=SUI
        // 注意：DEEP_SUI 是白名單池，0% 手續費
        const suiAmount = Math.round(inputAmount * SUI_SCALAR)
        
        // 從 gas coin 分出要交換的 SUI
        const [suiCoin] = tx.splitCoins(tx.gas, [suiAmount])
        
        // 創建空的 DEEP coin (base - 我們要買的)
        const [zeroBase] = tx.moveCall({
          target: '0x2::coin::zero',
          typeArguments: [DEEP_TYPE]
        })
        
        // 創建空的 DEEP coin（手續費用）
        const [zeroDeepFee] = tx.moveCall({
          target: '0x2::coin::zero',
          typeArguments: [DEEP_TYPE]
        })

        // 調用 swap_exact_quantity
        // 函數簽名: swap_exact_quantity(pool, base_in, quote_in, deep_in, min_out, clock)
        // 返回值: (Coin<Base>, Coin<Quote>, Coin<DEEP>) - 3個coins
        const [baseOut, quoteOut, deepOut] = tx.moveCall({
          target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quantity`,
          arguments: [
            tx.object(POOL_DEEP_SUI),
            zeroBase,        // base_in: 空的 DEEP (我們是買方)
            suiCoin,         // quote_in: SUI coin 要花的
            zeroDeepFee,     // deep_in: DEEP coin 用於手續費（白名單池為0）
            tx.pure.u64(0),  // min_out: 最小獲得數量
            tx.object('0x6') // Clock
          ],
          typeArguments: [DEEP_TYPE, SUI_TYPE]
        })

        // 將結果轉給自己（3個 coins: base獲得, quote剩餘, deep剩餘）
        tx.transferObjects([baseOut, quoteOut, deepOut], account.address)
        
      } else {
        // 賣 DEEP 換 SUI (使用 swap_exact_quantity)
        // 注意：DEEP_SUI 是白名單池，0% 手續費
        const deepAmount = Math.round(inputAmount * DEEP_SCALAR)
        
        // 獲取用戶的 DEEP coins
        const deepCoins = await client.getCoins({
          owner: account.address,
          coinType: DEEP_TYPE
        })
        
        if (deepCoins.data.length === 0) {
          setError('沒有 DEEP 代幣')
          return
        }

        // 合併所有 DEEP coins
        const primaryCoin = tx.object(deepCoins.data[0].coinObjectId)
        if (deepCoins.data.length > 1) {
          const otherCoins = deepCoins.data.slice(1).map(c => tx.object(c.coinObjectId))
          tx.mergeCoins(primaryCoin, otherCoins)
        }
        
        // 分出要賣的數量
        const [deepCoin] = tx.splitCoins(primaryCoin, [deepAmount])
        
        // 創建空的 SUI coin (quote - 我們要獲得的)
        const [zeroQuote] = tx.moveCall({
          target: '0x2::coin::zero',
          typeArguments: [SUI_TYPE]
        })
        
        // 創建空的 DEEP coin（手續費用）
        const [zeroDeepFee] = tx.moveCall({
          target: '0x2::coin::zero',
          typeArguments: [DEEP_TYPE]
        })

        // 調用 swap_exact_quantity
        // 函數簽名: swap_exact_quantity(pool, base_in, quote_in, deep_in, min_out, clock)
        // 返回值: (Coin<Base>, Coin<Quote>, Coin<DEEP>) - 3個coins
        const [baseOut, quoteOut, deepOut] = tx.moveCall({
          target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quantity`,
          arguments: [
            tx.object(POOL_DEEP_SUI),
            deepCoin,        // base_in: DEEP coin 要賣的
            zeroQuote,       // quote_in: 空的 SUI (我們是賣方)
            zeroDeepFee,     // deep_in: DEEP coin 用於手續費（白名單池為0）
            tx.pure.u64(0),  // min_out: 最小獲得數量
            tx.object('0x6') // Clock
          ],
          typeArguments: [DEEP_TYPE, SUI_TYPE]
        })

        // 將結果轉給自己（3個 coins: base剩餘, quote獲得, deep剩餘）
        tx.transferObjects([baseOut, quoteOut, deepOut], account.address)
      }

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            try {
              const txDetails = await client.waitForTransaction({
                digest: result.digest,
                options: { showEffects: true }
              })
              
              if (txDetails.effects?.status?.status === 'success') {
                setTxResult(result.digest)
                setAmount('')
                loadOrderBook()
              } else {
                const errorMsg = txDetails.effects?.status?.error || '交易執行失敗'
                setError(`交易失敗: ${errorMsg}`)
              }
            } catch {
              setTxResult(result.digest)
              setAmount('')
              loadOrderBook()
            }
          },
          onError: (err) => {
            console.error('Swap error:', err)
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
        Sui 原生訂單簿 DEX - DEEP/SUI 交易對
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <div style={{ 
              flex: '1 1 150px', 
              padding: '16px', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>SUI 餘額</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                {suiBalance ?? '...'} SUI
              </p>
            </div>
            <div style={{ 
              flex: '1 1 150px', 
              padding: '16px', 
              backgroundColor: 'rgba(168, 85, 247, 0.1)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>DEEP 餘額</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#a855f7' }}>
                {deepBalance ?? '...'} DEEP
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 交易對資訊 */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>DEEP / SUI</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          用 SUI 購買 DEEP 代幣，或賣出 DEEP 換回 SUI
        </p>
        {orderBook && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              中間價: <strong style={{ color: 'var(--text-primary)' }}>{orderBook.midPrice} SUI</strong>
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              價差: <strong style={{ color: 'var(--text-primary)' }}>{orderBook.spread} SUI</strong>
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
                  <th style={{ textAlign: 'left', fontWeight: 'normal' }}>價格 (SUI)</th>
                  <th style={{ textAlign: 'right', fontWeight: 'normal' }}>數量 (DEEP)</th>
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
                  <th style={{ textAlign: 'left', fontWeight: 'normal' }}>價格 (SUI)</th>
                  <th style={{ textAlign: 'right', fontWeight: 'normal' }}>數量 (DEEP)</th>
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
        <h4 style={{ margin: '0 0 16px 0' }}>🔄 Swap 交易</h4>
        
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
            🟢 買入 DEEP
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
            🔴 賣出 DEEP
          </button>
        </div>

        {/* 數量輸入 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>
            {side === 'buy' ? '支付 SUI 數量' : '賣出 DEEP 數量'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={side === 'buy' ? '輸入 SUI 數量' : '輸入 DEEP 數量'}
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
              {side === 'buy' ? 'SUI' : 'DEEP'}
            </span>
          </div>
          {orderBook && amount && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '8px' 
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>預估獲得</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {side === 'buy' 
                  ? `≈ ${(parseFloat(amount || '0') / parseFloat(orderBook.midPrice)).toFixed(2)} DEEP`
                  : `≈ ${(parseFloat(amount || '0') * parseFloat(orderBook.midPrice)).toFixed(4)} SUI`
                }
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                參考價格: 1 DEEP ≈ {orderBook.midPrice} SUI
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
              ? `用 ${amount || '0'} SUI 買入 DEEP` 
              : `賣出 ${amount || '0'} DEEP 換 SUI`
          }
        </button>
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
        <h4 style={{ marginBottom: '12px' }}>💡 DeepBook V3 說明</h4>
        <ul style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
          <li><strong style={{ color: '#ff4757' }}>⚠️ 最小交易量</strong>：至少需要交易 {MIN_SIZE} DEEP（約 {(MIN_SIZE * 0.68).toFixed(1)} SUI）</li>
          <li><strong>交易對</strong>：DEEP/SUI - 只需要 SUI 即可交易</li>
          <li><strong>買入 DEEP</strong>：用 SUI 購買 DEEP 代幣</li>
          <li><strong>賣出 DEEP</strong>：將 DEEP 換回 SUI</li>
          <li><strong>手續費</strong>：0%（白名單池）</li>
          <li><strong>Pool 地址</strong>：<code style={{ fontSize: '10px' }}>{POOL_DEEP_SUI.slice(0, 20)}...</code></li>
          <li><strong>獲取 SUI</strong>：使用 <a href="https://faucet.polymedia.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Sui Faucet</a></li>
        </ul>
      </div>
    </div>
  )
}

export default DeepBookSwap
