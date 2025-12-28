import { useState } from 'react'
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient,
  ConnectButton
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

function TransferForm() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [txResult, setTxResult] = useState<{
    digest: string
    status: 'success' | 'failure'
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setTxResult(null)

    // 驗證
    if (!recipient.trim()) {
      setError('請輸入目標地址')
      return
    }
    if (!recipient.startsWith('0x')) {
      setError('地址格式錯誤，應以 0x 開頭')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('請輸入有效的轉帳金額')
      return
    }

    try {
      // 將 SUI 轉換為 MIST (1 SUI = 10^9 MIST)
      const amountInMist = BigInt(Math.floor(Number(amount) * 1e9))

      // 建立交易
      const tx = new Transaction()
      
      // 分割 coin 並轉帳
      const [coin] = tx.splitCoins(tx.gas, [amountInMist])
      tx.transferObjects([coin], recipient)

      // 簽名並執行交易
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            // 等待交易確認
            const txResponse = await suiClient.waitForTransaction({
              digest: result.digest,
              options: { showEffects: true }
            })
            
            const status = txResponse.effects?.status?.status === 'success' 
              ? 'success' 
              : 'failure'
            
            setTxResult({
              digest: result.digest,
              status
            })
          },
          onError: (err) => {
            setError(err.message || '交易失敗')
          }
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立交易失敗')
    }
  }

  // Testnet 區塊瀏覽器連結
  const getExplorerUrl = (digest: string) => {
    return `https://suiscan.xyz/testnet/tx/${digest}`
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>💸 UserStory 4：轉帳</h2>
        <span style={{ padding: '4px 12px', backgroundColor: '#6366f1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>Testnet</span>
      </div>
      
      {/* 提醒切換到 Testnet */}
      <div style={{ 
        background: '#78520a', 
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        color: '#fff3cd'
      }}>
        ⚠️ 請確保錢包已切換到 <strong>Testnet</strong> 網路
      </div>

      {!account ? (
        <div className="wallet-info-card">
          <p style={{ marginBottom: '16px' }}>請先連接錢包以進行轉帳</p>
          <ConnectButton />
        </div>
      ) : (
        <>
          <div className="wallet-info-card" style={{ marginBottom: '16px' }}>
            <div className="info-row">
              <span className="info-label">🔗 已連接錢包</span>
              <span className="info-value" style={{ fontSize: '0.85rem' }}>
                {account.address}
              </span>
            </div>
          </div>

          <form onSubmit={handleTransfer}>
            <div className="input-group">
              <label htmlFor="recipient">目標地址</label>
              <input
                id="recipient"
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="input-group">
              <label htmlFor="amount">轉帳金額 (SUI)</label>
              <input
                id="amount"
                type="number"
                step="0.000000001"
                min="0"
                placeholder="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>

            <button 
              type="submit" 
              className="submit-btn" 
              disabled={isPending}
            >
              {isPending ? '交易處理中...' : '發送交易'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {txResult && (
            <div className={txResult.status === 'success' ? 'success-message' : 'error-message'}>
              {txResult.status === 'success' ? '✅ 交易成功！' : '❌ 交易失敗'}
              <div style={{ marginTop: '12px' }}>
                <strong>Transaction Digest:</strong>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  marginTop: '4px'
                }}>
                  {txResult.digest}
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <a 
                  href={getExplorerUrl(txResult.digest)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tx-link"
                  style={{ fontWeight: 'bold' }}
                >
                  🔗 在 Suiscan 上查看交易
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TransferForm
