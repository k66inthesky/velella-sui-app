import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

// Nautilus 預測市場 - 簡化版
function PredictionMarket() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no' | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [txResult, setTxResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)

  // 載入餘額
  useEffect(() => {
    const fetchBalance = async () => {
      if (!account?.address) return
      try {
        const balanceResult = await client.getBalance({ owner: account.address })
        const suiBalance = Number(balanceResult.totalBalance) / 1_000_000_000
        setBalance(suiBalance.toFixed(4))
      } catch (err) {
        console.error('Fetch balance error:', err)
      }
    }
    fetchBalance()
  }, [account?.address, client, txResult])

  // 模擬預測市場資料
  const market = {
    question: 'SUI 價格會在 2025 Q1 突破 $5 嗎？',
    endTime: '2025-03-31',
    totalPool: '10,000 SUI',
    yesPool: '6,500 SUI',
    noPool: '3,500 SUI',
    yesOdds: '1.54x',
    noOdds: '2.86x',
  }

  const handlePlaceBet = async () => {
    if (!account || !selectedOutcome || !betAmount) {
      setError('請連接錢包、選擇結果並輸入金額')
      return
    }

    setError(null)
    setTxResult(null)

    try {
      const tx = new Transaction()
      
      // TODO: 實作預測市場合約呼叫
      // 這需要：
      // 1. 部署預測市場合約
      // 2. 呼叫 place_bet 函數
      // 3. 傳入選擇的 outcome 和金額
      
      const amountInMist = BigInt(parseFloat(betAmount) * 1_000_000_000)
      const [coin] = tx.splitCoins(tx.gas, [amountInMist])
      
      // Placeholder: 這裡應該呼叫預測市場合約
      // tx.moveCall({
      //   target: `${PREDICTION_PACKAGE}::market::place_bet`,
      //   arguments: [marketObject, coin, selectedOutcome === 'yes'],
      // })
      
      // 暫時只是轉帳給自己展示流程
      tx.transferObjects([coin], account.address)
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setTxResult(result.digest)
            setBetAmount('')
            setSelectedOutcome(null)
          },
          onError: (err) => {
            setError(err.message)
          }
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '下注失敗')
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>🐚 Nautilus 預測市場</h2>
        <span style={{ padding: '4px 12px', backgroundColor: '#6366f1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Testnet</span>
      </div>
      <p className="description">
        使用可信運算驗證的去中心化預測市場
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
          <div className="result-item">
            <span className="result-label">餘額</span>
            <span className="result-value">{balance ?? '載入中...'} SUI</span>
          </div>
        </div>
      )}

      {/* 預測問題 */}
      <div className="result-card" style={{ marginBottom: '24px' }}>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          marginBottom: '16px',
          lineHeight: 1.4
        }}>
          {market.question}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>結算日期</div>
            <div>{market.endTime}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>總獎池</div>
            <div>{market.totalPool}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>狀態</div>
            <div style={{ color: '#00d26a' }}>進行中</div>
          </div>
        </div>

        {/* 賠率展示 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(0, 210, 106, 0.1)',
            borderRadius: '8px',
            border: selectedOutcome === 'yes' ? '2px solid #00d26a' : '2px solid transparent',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedOutcome('yes')}
          >
            <div style={{ color: '#00d26a', fontWeight: 'bold', fontSize: '18px' }}>YES</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>賠率: {market.yesOdds}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>池: {market.yesPool}</div>
          </div>
          
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 71, 87, 0.1)',
            borderRadius: '8px',
            border: selectedOutcome === 'no' ? '2px solid #ff4757' : '2px solid transparent',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedOutcome('no')}
          >
            <div style={{ color: '#ff4757', fontWeight: 'bold', fontSize: '18px' }}>NO</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>賠率: {market.noOdds}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>池: {market.noPool}</div>
          </div>
        </div>
      </div>

      {/* 下注表單 */}
      <div className="result-card">
        <h4 style={{ margin: '0 0 16px 0' }}>下注</h4>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>
            下注金額 (SUI)
          </label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="輸入 SUI 數量"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
          />
        </div>

        {/* 預估收益 */}
        {selectedOutcome && betAmount && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              若 {selectedOutcome.toUpperCase()} 獲勝，預估收益:
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold',
              color: selectedOutcome === 'yes' ? '#00d26a' : '#ff4757'
            }}>
              {(parseFloat(betAmount || '0') * parseFloat(selectedOutcome === 'yes' ? market.yesOdds : market.noOdds)).toFixed(2)} SUI
            </div>
          </div>
        )}

        <button
          onClick={handlePlaceBet}
          disabled={!account || !selectedOutcome || !betAmount || isPending}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: selectedOutcome === 'yes' ? '#00d26a' : selectedOutcome === 'no' ? '#ff4757' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!account || !selectedOutcome || !betAmount || isPending) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: (!account || !selectedOutcome || !betAmount) ? 0.5 : 1
          }}
        >
          {isPending ? '交易中...' : selectedOutcome ? `下注 ${selectedOutcome.toUpperCase()}` : '請選擇結果'}
        </button>
      </div>

      {/* 交易結果 */}
      {txResult && (
        <div className="result-card" style={{ marginTop: '16px', backgroundColor: 'rgba(0, 255, 127, 0.1)' }}>
          <h4>✅ 下注成功</h4>
          <a 
            href={`https://testnet.suivision.xyz/txblock/${txResult}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary)' }}
          >
            查看交易詳情 →
          </a>
        </div>
      )}

      {/* 說明 */}
      <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
        <p>🐚 Nautilus 使用 TEE (可信執行環境) 確保結果公正</p>
        <p>🔒 結算由可驗證的鏈下運算完成</p>
        <p>💡 這是概念展示，實際需部署預測市場合約</p>
      </div>
    </div>
  )
}

export default PredictionMarket
