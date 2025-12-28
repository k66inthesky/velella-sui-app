import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'
import { registerEnokiWallets } from '@mysten/enoki'
import '@mysten/dapp-kit/dist/index.css'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

// 網路配置
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
}

// 註冊 Enoki zkLogin 錢包（會自動加入到錢包列表）
registerEnokiWallets({
  apiKey: import.meta.env.VITE_ENOKI_API_KEY,
  providers: {
    google: {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirectUrl: window.location.origin,
    },
  },
  client: new SuiClient({ url: getFullnodeUrl('testnet') }),
  network: 'testnet',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
