# Velella Dashboard

<div align="center">
  <img src="frontend/src/assets/velella-logo.png" alt="Velella Logo" width="150">
  <p><strong> Velella：連結 Mainnet 資產與 Testnet 數據的輕量化 Sui 全棧導航儀。</strong></p>
</div>

Live Demo: https://velella-sui-app.vercel.app/

https://github.com/user-attachments/assets/a773a1a3-553e-472e-b353-64654aff4174

---

## Tech Stack

| 類別 | 技術 |
|------|------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Node.js + Express + TypeScript |
| **Blockchain SDK** | @mysten/sui, @mysten/dapp-kit |
| **zkLogin** | @mysten/enoki (Google OAuth) |
| **Storage** | Walrus Testnet + AES-256-GCM |
| **DEX** | DeepBook V3 (@mysten/deepbook-v3) |
| **DeFi** | Bucket Protocol (@bucket-protocol/sdk) |
| **部署** | Vercel (Serverless Functions) |

---

## 專案結構

\`\`\`
velella-sui-app/
├── package.json                    # 根目錄 package.json（Vercel 部署用）
├── vercel.json                     # Vercel 配置
├── .gitignore                      # Git 忽略檔案
├── README.md                       # 專案說明文件
│
├── api/                            # Vercel Serverless Functions
│   ├── wallet/
│   │   └── [address]/
│   │       ├── balance.ts          # 查詢餘額 API
│   │       └── validate.ts         # 驗證地址 API
│   └── object/
│       ├── fixed.ts                # 固定 Object API
│       └── [objectId].ts           # 動態 Object API
│
├── frontend/                       # React + TypeScript + Vite
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx               # 入口，配置 SuiClientProvider
│       ├── App.tsx                # 主應用 + Tab 導航 + 網路切換
│       ├── index.css              # Velella 海洋藍主題 (含 RWD)
│       ├── assets/
│       │   └── velella-logo.png   # Logo 圖片
│       ├── components/
│       │   ├── WalletConnect.tsx  # UserStory 1-1：連接錢包 (Mainnet)
│       │   ├── AddressQuery.tsx   # UserStory 1-2：查詢地址 (Mainnet)
│       │   ├── ObjectDisplay.tsx  # UserStory 3：Object 資料 (Testnet)
│       │   ├── TransferForm.tsx   # UserStory 4：轉帳 (Testnet)
│       │   ├── ZkLoginKiosk.tsx   # Bonus 1：zkLogin 登入
│       │   ├── WalrusUpload.tsx   # Bonus 2：Walrus 檔案儲存
│       │   ├── DeepBookSwap.tsx   # Bonus 3：DeepBook DEX
│       │   └── BucketDashboard.tsx # Bonus 4：Bucket Protocol
│       ├── hooks/
│       │   └── useCoinBlocklist.ts # 代幣黑白名單 Hook
│       └── services/
│           └── api.ts             # API 服務
│
└── backend/                        # Node.js + Express（本地開發用）
    ├── package.json
    ├── tsconfig.json
    ├── .env.example               # 環境變數範例
    └── src/
        ├── index.ts               # Express 入口
        ├── routes/
        │   ├── wallet.routes.ts   # 錢包路由
        │   └── object.routes.ts   # Object 路由
        ├── controllers/
        │   ├── wallet.controller.ts
        │   └── object.controller.ts
        └── services/
            └── sui.service.ts     # Sui SDK 服務層
\`\`\`

---

## 設計主題

採用 **Velella 海洋藍主題**，靈感來自可愛的水母角色：

| 顏色 | 用途 |
|------|------|
| \`#00b4d8\` | 主色 (Ocean Blue) |
| \`#48cae4\` | 淺藍 (Light Blue) |
| \`#0077b6\` | 深藍 (Deep Ocean) |
| \`#0a1628\` | 背景 (Dark Navy) |
| \`#e8f4f8\` | 文字 (Light Text) |

特色：
- 🌊 深邃的海洋藍背景
- 💎 清晰易讀的文字對比
- ✨ 柔和的發光效果
- 📱 完整 RWD 響應式設計

---

## 功能總覽

| UserStory | 功能 | 網路 | 狀態 |
|-----------|------|------|------|
| 1-1 | 連接錢包 + 顯示餘額 | Mainnet | ✅ |
| 1-2 | 查詢任意地址餘額 + 代幣 | Mainnet | ✅ |
| 3 | 讀取 Object 資料 | Testnet | ✅ |
| 4 | 發送 SUI 轉帳交易 | Testnet | ✅ |
| 5 | 支援 zkLogin | Testnet | ✅ |
| 6 | 支援 Walrus | Testnet | ✅ |
| 7 | 支援 DeepBook | Testnet | ✅ |
| 8 | 支援 Bucket Protocol SDK | Mainnet | ✅ |

+ 第1-4是基礎功能。
+ 第5-8是Bonus功能。

---

## Bonus 功能 (Advanced Sui Ecosystem)

### Bonus 1: zkLogin 無縫登入 ✅

| 項目 | 說明 |
|------|------|
| **技術** | Enoki SDK + Google OAuth |
| **功能** | 使用 Google 帳號登入，自動產生 Sui 錢包地址 |
| **優勢** | 無需安裝錢包擴充套件，降低 Web3 入門門檻 |

### Bonus 2: Walrus 去中心化儲存 ✅

| 項目 | 說明 |
|------|------|
| **技術** | Walrus Testnet + AES-256-GCM 加密 |
| **功能** | 上傳/下載檔案至 Walrus 去中心化儲存網路 |
| **加密** | 前端 AES-256-GCM 加密，支援密鑰備份與還原 |

### Bonus 3: DeepBook V3 去中心化交易所 ✅

| 項目 | 說明 |
|------|------|
| **技術** | DeepBook V3 SDK |
| **交易對** | DEEP/SUI (Testnet) |
| **功能** | 即時訂單簿、市價買賣、真實鏈上交易 |
| **最小交易量** | 10 DEEP（約 6.8 SUI） |

> ⚠️ **Note**: DeepBook pool 的 min_size = 10 DEEP，交易量太小會被拒絕。

### Bonus 4: Bucket Protocol 儀表板 ✅

| 項目 | 說明 |
|------|------|
| **技術** | @bucket-protocol/sdk |
| **網路** | Mainnet |
| **功能** | 查詢 Vault、Position、PSM Pool、Oracle 價格 |
| **說明** | Sui 原生 CDP 穩定幣協議，抵押資產借出 USDB |

---

### Bonus 功能技術架構

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│                     Velella Dashboard                         │
├──────────────────────────────────────────────────────────────┤
│  zkLogin (Enoki)  │  Walrus + AES  │  DeepBook  │  Bucket    │
│  ───────────────  │  ────────────  │  ────────  │  ───────── │
│  Google OAuth     │  File Upload   │  Order Book│  CDP Query │
│  Zero-Knowledge   │  256-bit Key   │  DEEP/SUI  │  Vault/PSM │
│  Proof Login      │  Encrypted     │  Trading   │  Oracle    │
└──────────────────────────────────────────────────────────────┘
\`\`\`

---

## 快速開始

### 本地開發

#### 1. 安裝依賴

\`\`\`bash
# 一次安裝所有依賴
npm run install:all

# 或分別安裝
cd backend && npm install
cd ../frontend && npm install
\`\`\`

#### 2. 設定環境變數

\`\`\`bash
cd backend
cp .env.example .env
# 編輯 .env 設定 RPC URL（可選）
\`\`\`

#### 3. 啟動服務

\`\`\`bash
# 同時啟動前後端
npm run dev

# 或分別啟動
cd backend && npm run dev   # Terminal 1
cd frontend && npm run dev  # Terminal 2
\`\`\`

#### 4. 開啟瀏覽器

\`\`\`
http://localhost:3000
\`\`\`

---

## Vercel 部署

### 部署步驟

\`\`\`bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入 Vercel
vercel login

# 3. 設定環境變數
vercel env add TESTNET_OBJECT_ID
# 輸入: 0xeeb34a78eaf4ae873c679db294296778676de4a335f222856716d1ad6ed54e45

# 4. 部署
vercel --prod
\`\`\`

### Vercel 設定

| 設定 | 值 |
|------|-----|
| Build Command | \`cd frontend && npm run build\` |
| Output Directory | \`frontend/dist\` |
| Install Command | \`npm install && cd frontend && npm install && cd ../backend && npm install\` |

---

## API 端點

| 方法 | 路徑 | 說明 | 網路 |
|------|------|------|------|
| GET | \`/api/wallet/:address/validate\` | 驗證地址 | Mainnet |
| GET | \`/api/wallet/:address/balance\` | 查詢餘額 | Mainnet |
| GET | \`/api/object/fixed\` | 固定 Object | Testnet |
| GET | \`/api/object/:objectId\` | 動態 Object | Testnet |

---

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| \`PORT\` | Backend 服務埠 | 5000 |
| \`SUI_MAINNET_RPC_URL\` | Mainnet RPC URL | 官方免費節點 |
| \`SUI_TESTNET_RPC_URL\` | Testnet RPC URL | 官方免費節點 |
| \`TESTNET_OBJECT_ID\` | 固定 Object ID | - |
| \`ENOKI_API_KEY\` | Enoki API Key (zkLogin) | - |
| \`GOOGLE_CLIENT_ID\` | Google OAuth Client ID | - |

---

## 代幣驗證狀態說明

| 狀態 | 圖示 | 說明 |
|------|------|------|
| 黑名單 (Scam) | 😈 scam | MystenLabs 官方認證的詐騙代幣 |
| 白名單 (Verified) | 😇 verified | MystenLabs 官方認證的合法代幣 |
| 未知 (Unknown) | 🤔 unknown | 不在黑白名單中的代幣 |

---

## License

MIT
