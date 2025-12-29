import { useState, useEffect } from 'react'
import { useSuiClientContext } from '@mysten/dapp-kit'
import WalletConnect from './components/WalletConnect'
import AddressQuery from './components/AddressQuery'
import ObjectDisplay from './components/ObjectDisplay'
import TransferForm from './components/TransferForm'
import ZkLoginKiosk from './components/ZkLoginKiosk'
import WalrusUpload from './components/WalrusUpload'
import DeepBookSwap from './components/DeepBookSwap'
import BucketDashboard from './components/BucketDashboard'
import logoImg from './assets/velella-logo.png'

type TabType = 'wallet' | 'query' | 'object' | 'transfer' | 'zklogin' | 'walrus' | 'deepbook' | 'bucket'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('wallet')
  const { network, selectNetwork } = useSuiClientContext()

  // 根據 Tab 自動切換網路
  useEffect(() => {
    if (activeTab === 'wallet' || activeTab === 'query' || activeTab === 'bucket') {
      if (network !== 'mainnet') {
        selectNetwork('mainnet')
      }
    } else if (activeTab === 'object' || activeTab === 'transfer' || activeTab === 'deepbook') {
      if (network !== 'testnet') {
        selectNetwork('testnet')
      }
    }
    // zklogin 和 walrus 不需要切換網路（獨立運作）
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
          連接錢包
        </button>
        <button 
          className={`tab ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          查詢地址
        </button>
        <button 
          className={`tab ${activeTab === 'object' ? 'active' : ''}`}
          onClick={() => setActiveTab('object')}
        >
          Object 資料
        </button>
        <button 
          className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          轉帳
        </button>
        <button 
          className={`tab ${activeTab === 'zklogin' ? 'active' : ''}`}
          onClick={() => setActiveTab('zklogin')}
        >
          🔐 zkLogin
        </button>
        <button 
          className={`tab ${activeTab === 'walrus' ? 'active' : ''}`}
          onClick={() => setActiveTab('walrus')}
        >
          🦭 Walrus
        </button>
        <button 
          className={`tab ${activeTab === 'deepbook' ? 'active' : ''}`}
          onClick={() => setActiveTab('deepbook')}
        >
          📊 DeepBook
        </button>
        <button 
          className={`tab ${activeTab === 'bucket' ? 'active' : ''}`}
          onClick={() => setActiveTab('bucket')}
        >
          🪣 Bucket
        </button>
      </div>

      {activeTab === 'wallet' && <WalletConnect />}
      {activeTab === 'query' && <AddressQuery />}
      {activeTab === 'object' && <ObjectDisplay />}
      {activeTab === 'transfer' && <TransferForm />}
      {activeTab === 'zklogin' && <ZkLoginKiosk />}
      {activeTab === 'walrus' && <WalrusUpload />}
      {activeTab === 'deepbook' && <DeepBookSwap />}
      {activeTab === 'bucket' && <BucketDashboard />}
    </div>
  )
}

export default App
