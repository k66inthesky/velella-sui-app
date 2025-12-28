import { 
  ConnectButton, 
  useCurrentAccount, 
  useSuiClientQuery 
} from '@mysten/dapp-kit'

function WalletConnect() {
  const account = useCurrentAccount()
  
  // 查詢 SUI 餘額 (只在連接後查詢)
  const { data: balance, isLoading } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '' },
    { enabled: !!account }
  )

  // 格式化餘額 (MIST -> SUI)
  const formatBalance = (totalBalance: string) => {
    const sui = Number(totalBalance) / 1e9
    return sui.toLocaleString('en-US', { 
      minimumFractionDigits: 4,
      maximumFractionDigits: 9 
    })
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>📱 UserStory 1-1：連接錢包</h2>
        <span style={{ padding: '4px 12px', backgroundColor: '#22c55e', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>Mainnet</span>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <ConnectButton />
      </div>

      {!account ? (
        <div className="wallet-info-card empty">
          <p>🔌 請點擊上方按鈕連接錢包</p>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            支援 Sui Wallet、Slush Wallet 等錢包
          </p>
        </div>
      ) : (
        <div className="wallet-info-card">
          <div className="info-row">
            <span className="info-label">🏦 錢包地址</span>
            <span className="info-value">{account.address}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">💰 SUI 餘額</span>
            {isLoading ? (
              <span className="info-value">載入中...</span>
            ) : (
              <span className="info-value balance-value">
                {balance ? formatBalance(balance.totalBalance) : '0'} SUI
              </span>
            )}
          </div>

          <div className="info-row">
            <span className="info-label">🔗 網路</span>
            <span className="info-value">Mainnet</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletConnect
