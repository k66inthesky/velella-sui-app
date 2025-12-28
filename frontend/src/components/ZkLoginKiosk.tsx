import { useEffect, useState } from 'react'
import { 
  useCurrentAccount, 
  useDisconnectWallet, 
  useSignAndExecuteTransaction,
  useSuiClient,
  ConnectModal,
  useConnectWallet,
  useWallets
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

// zkLogin 頁面 - 使用 Enoki 註冊的 Google 錢包
function ZkLoginKiosk() {
  const client = useSuiClient()
  const account = useCurrentAccount()
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()
  const { mutate: disconnect } = useDisconnectWallet()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  
  const [balance, setBalance] = useState<string | null>(null)
  const [txResult, setTxResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)

  // 找到 Google zkLogin 錢包
  const googleWallet = wallets.find(w => w.name.toLowerCase().includes('google'))

  // 取得餘額
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

  const handleGoogleLogin = () => {
    setError(null)
    if (googleWallet) {
      connect({ wallet: googleWallet })
    } else {
      setShowConnectModal(true)
    }
  }

  // 示範交易：自轉帳
  const handleDemoTx = async () => {
    if (!account?.address) return

    setError(null)
    setTxResult(null)

    try {
      const tx = new Transaction()
      
      // 簡單的自轉帳交易
      const [coin] = tx.splitCoins(tx.gas, [1_000_000]) // 0.001 SUI
      tx.transferObjects([coin], account.address)
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setTxResult(result.digest)
          },
          onError: (err) => {
            setError(err.message)
          }
        }
      )
    } catch (err) {
      console.error('Transaction error:', err)
      setError(err instanceof Error ? err.message : '交易失敗')
    }
  }

  const handleLogout = () => {
    disconnect()
    setBalance(null)
    setTxResult(null)
    setError(null)
  }

  // 檢查是否是 zkLogin 錢包
  const isZkLogin = account?.label?.toLowerCase().includes('google') || 
                    account?.label?.toLowerCase().includes('enoki')

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>🔐 zkLogin (Enoki)</h2>
        <span style={{ padding: '4px 12px', backgroundColor: '#6366f1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Testnet</span>
      </div>
      <p className="description">
        使用 Google 帳號登入，自動產生 Sui 錢包
      </p>

      {error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <ConnectModal
        trigger={<></>}
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
      />

      {!account ? (
        <div className="login-section">
          <button 
            onClick={handleGoogleLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 32px',
              fontSize: '18px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              margin: '0 auto'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 登入
          </button>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => setShowConnectModal(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              或選擇其他錢包
            </button>
          </div>
          
          <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
            <p>✨ 使用 zkLogin 技術，無需安裝錢包</p>
            <p>🔒 Google 帳號即為您的 Sui 錢包</p>
          </div>
        </div>
      ) : (
        <div className="logged-in-section">
          <div className="result-card">
            <h3>✅ 已連接</h3>
            <div className="result-item">
              <span className="result-label">登入方式</span>
              <span className="result-value">
                {isZkLogin ? 'Google (zkLogin)' : account.label || '錢包'}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Sui 地址</span>
              <span className="result-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {account.address}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">餘額</span>
              <span className="result-value">{balance ?? '載入中...'} SUI</span>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button 
              onClick={handleDemoTx}
              disabled={isPending || !balance || parseFloat(balance) < 0.002}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (isPending || !balance || parseFloat(balance) < 0.002) ? 'not-allowed' : 'pointer',
                opacity: (isPending || !balance || parseFloat(balance) < 0.002) ? 0.6 : 1
              }}
            >
              {isPending ? '交易中...' : '🚀 發送測試交易'}
            </button>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              發送 0.001 SUI 給自己（測試用）
            </p>
          </div>

          {txResult && (
            <div className="result-card" style={{ marginTop: '24px', backgroundColor: 'rgba(0, 255, 127, 0.1)' }}>
              <h3>🎉 交易成功！</h3>
              <div className="result-item">
                <span className="result-label">交易 Digest</span>
                <span className="result-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {txResult}
                </span>
              </div>
              <a 
                href={`https://suiscan.xyz/testnet/tx/${txResult}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', fontSize: '14px' }}
              >
                在 SuiScan 查看 →
              </a>
            </div>
          )}

          <button 
            onClick={handleLogout}
            style={{
              marginTop: '24px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--text-muted)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            斷開連接
          </button>
        </div>
      )}

      {/* 技術說明 */}
      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '12px' }}>💡 技術說明</h4>
        <ul style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
          <li><strong>zkLogin</strong>：使用零知識證明，將 OAuth 身份映射到 Sui 地址</li>
          <li><strong>Enoki</strong>：Mysten Labs 提供的 zkLogin 服務</li>
          <li><strong>無私鑰</strong>：用戶不需要管理私鑰，Google 帳號就是錢包</li>
        </ul>
      </div>
    </div>
  )
}

export default ZkLoginKiosk
