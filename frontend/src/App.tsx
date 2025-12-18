import { useState, useEffect } from 'react'
import { useSuiClientContext } from '@mysten/dapp-kit'
import WalletConnect from './components/WalletConnect'
import AddressQuery from './components/AddressQuery'
import ObjectDisplay from './components/ObjectDisplay'
import TransferForm from './components/TransferForm'
import logoImg from './assets/velella-logo.png'

type TabType = 'wallet' | 'query' | 'object' | 'transfer'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('wallet')
  const { network, selectNetwork } = useSuiClientContext()

  // 根據 Tab 自動切換網路
  useEffect(() => {
    if (activeTab === 'wallet' || activeTab === 'query') {
      if (network !== 'mainnet') {
        selectNetwork('mainnet')
      }
    } else if (activeTab === 'object' || activeTab === 'transfer') {
      if (network !== 'testnet') {
        selectNetwork('testnet')
      }
    }
  }, [activeTab, network, selectNetwork])

  return (
    <div className="app">
      {/* Header with Logo */}
      <div className="app-header">
        <img src={logoImg} alt="Velella Logo" className="app-logo" />
        <h1 className="app-title">
          <span className="highlight">Velella</span> Dashboard
        </h1>
      </div>
      
      {/* Network Indicator */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className={`network-indicator ${network}`}>
          <span className="dot"></span>
          <span>目前網路: <strong>{network === 'mainnet' ? 'Mainnet' : 'Testnet'}</strong></span>
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
        >
          連接錢包 (Mainnet)
        </button>
        <button 
          className={`tab ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          查詢地址 (Mainnet)
        </button>
        <button 
          className={`tab ${activeTab === 'object' ? 'active' : ''}`}
          onClick={() => setActiveTab('object')}
        >
          Object 資料 (Testnet)
        </button>
        <button 
          className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          轉帳 (Testnet)
        </button>
      </div>

      {activeTab === 'wallet' && <WalletConnect />}
      {activeTab === 'query' && <AddressQuery />}
      {activeTab === 'object' && <ObjectDisplay />}
      {activeTab === 'transfer' && <TransferForm />}
    </div>
  )
}

export default App
