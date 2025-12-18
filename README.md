# Velella Dashboard

<div align="center">
  <img src="frontend/src/assets/velella-logo.png" alt="Velella Logo" width="150">
  <p><strong> Veleella：連結 Mainnet 資產與 Testnet 數據的輕量化 Sui 全棧導航儀。</strong></p>
</div>

---

## Tech Stack

| 類別 | 技術 |
|------|------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Node.js + Express + TypeScript |
| **Blockchain SDK** | @mysten/sui, @mysten/dapp-kit |
| **部署** | Vercel (Serverless Functions) |

---

## 專案結構

```
velella-sui-app/
├── package.json                    # 根目錄 package.json（Vercel 部署用）
├── vercel.json                     # Vercel 配置
├── .gitignore                      # Git 忽略檔案
├── README.md                       # 專案說明文件
│
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
│       │   └── TransferForm.tsx   # UserStory 4：轉帳 (Testnet)
│       ├── hooks/
│       │   └── useCoinBlocklist.ts # 代幣黑白名單 Hook
│       └── services/
│           └── api.ts             # API 服務
│
├── backend/                        # Node.js + Express（本地開發用）
│   ├── package.json
│   ├── tsconfig.json
│   ├── .gitignore                 # Git 忽略檔案
│   ├── .env                       # 環境變數（不入版控）
│   ├── .env.example               # 環境變數範例
│   └── src/
│       ├── index.ts               # Express 入口
│       ├── routes/
│       │   ├── wallet.routes.ts   # 錢包路由
│       │   └── object.routes.ts   # Object 路由
│       ├── controllers/
│       │   ├── wallet.controller.ts
│       │   └── object.controller.ts
│       └── services/
│           └── sui.service.ts     # Sui SDK 服務層
```

---

## 設計主題

採用 **Velella 海洋藍主題**，靈感來自可愛的水母角色：

| 顏色 | 用途 |
|------|------|
| `#00b4d8` | 主色 (Ocean Blue) |
| `#48cae4` | 淺藍 (Light Blue) |
| `#0077b6` | 深藍 (Deep Ocean) |
| `#0a1628` | 背景 (Dark Navy) |
| `#e8f4f8` | 文字 (Light Text) |

特色：
- 🌊 深邃的海洋藍背景
- 💎 清晰易讀的文字對比
- ✨ 柔和的發光效果
- 📱 完整 RWD 響應式設計

---

## 需求檢查報告

### 額外功能 (Beyond Scope)

| 項目 | 狀態 | 說明 |
|------|------|------|
| RWD 響應式設計 | ✅ 已實作 | 支援桌面、平板、手機 |
| Scam Token 檢測 | ✅ 已實作 | 動態抓取 MystenLabs 官方黑白名單 |
| 只需顯示 Coin Type | ✅ 符合 | 顯示 symbol + coinType |

### 代幣驗證狀態說明

| 狀態 | 圖示 | 說明 |
|------|------|------|
| 黑名單 (Scam) | 😈 scam | MystenLabs 官方認證的詐騙代幣 |
| 白名單 (Verified) | 😇 verified | MystenLabs 官方認證的合法代幣 |
| 未知 (Unknown) | 🤔 unknown | 不在黑白名單中的代幣 |

---

### UserStory 1-1：連接錢包 (Mainnet)

| 需求 | 狀態 | 實作位置 |
|------|------|----------|
| 前端使用官方 Sui SDK | ✅ | `@mysten/dapp-kit` |
| 支援至少兩種錢包 | ✅ | Slush Wallet + OKX Wallet |
| 錢包連結前：顯示空白資訊卡 | ✅ | `WalletConnect.tsx` |
| 錢包連結後：顯示錢包地址 | ✅ | `WalletConnect.tsx` |
| 錢包連結後：顯示 SUI 餘額 | ✅ | `useSuiClientQuery('getBalance')` |

---

### UserStory 1-2：查詢特定錢包地址 (Mainnet)

| 需求 | 狀態 | 實作位置 |
|------|------|----------|
| 有輸入框輸入錢包地址 | ✅ | `AddressQuery.tsx` |
| 呼叫後端 API | ✅ | `GET /api/wallet/:address/balance` |
| 後端用 Sui RPC/SDK 查詢 | ✅ | `sui.service.ts` |
| 顯示 SUI 餘額 | ✅ | 前端顯示 `suiBalance` |
| 顯示其他代幣及數量 | ✅ | 使用 `getCoinMetadata` |
| 地址驗證 | ✅ | 區分錢包/合約/不存在地址 |

**範例錢包地址：**
```
0x1a66b986f6e938c9f6d4cf7b98c97c331165cad5759e13fbbb1dee01728841dd
```

#### 地址驗證測試案例

| # | 測試地址 | 預期結果 | 說明 |
|---|----------|----------|------|
| 1 | `0xffdd5b4f84cd4d306d619f2a90c8698fc1e27cefa3b06a2aa31ce7eab4539e48` | ❌ 拒絕 | 合約/Package 地址 |
| 2 | `0xffdd5b4f84cd4d306d619f2a90c8698fc1e27cefa3b06a2aa31ce7eab4539e49` | ❌ 拒絕 | 不存在的地址 |
| 3 | `0x2efdc566ba6202175beda0aa70175bc90c5155d7d47ae90187b8e2010cf4df2a` | ✅ 允許 | 有效的錢包地址 |
| 4 | `0x2efdc566ba6202175beda0aa70175bc90c5155d7d47ae90187b8e2010cf4df2` | ❌ 拒絕 | 格式錯誤 |
| 5 | `123` | ❌ 拒絕 | 格式錯誤 |

---

### UserStory 3：讀取 Testnet Object 資料

| 需求 | 狀態 | 實作位置 |
|------|------|----------|
| 後端固定連結 Testnet Object | ✅ | `.env` 中的 `TESTNET_OBJECT_ID` |
| 顯示 Admin / Id / Balance | ✅ | `ObjectDisplay.tsx` |
| 前端呼叫 API 顯示 | ✅ | `GET /api/object/fixed` |

**固定 Object ID：**
```
0xeeb34a78eaf4ae873c679db294296778676de4a335f222856716d1ad6ed54e45
```

---

### UserStory 4：發送交易 (Testnet)

| 需求 | 狀態 | 實作位置 |
|------|------|----------|
| 輸入目標地址 | ✅ | `TransferForm.tsx` |
| 輸入轉帳金額 (Only SUI) | ✅ | 只支援 SUI |
| 使用 Sui SDK 在前端發送交易 | ✅ | `useSignAndExecuteTransaction` |
| 顯示交易哈希 | ✅ | `txResult.digest` |
| 提供鏈上查看連結 | ✅ | `https://suiscan.xyz/testnet/tx/{digest}` |

---

## 快速開始

### 本地開發

#### 1. 安裝依賴

```bash
# 一次安裝所有依賴
npm run install:all

# 或分別安裝
cd backend && npm install
cd ../frontend && npm install
```

#### 2. 設定環境變數

```bash
cd backend
cp .env.example .env
# 編輯 .env 設定 RPC URL（可選）
```

#### 3. 放置 Logo 圖片

將 Velella logo 圖片放置於：
```
frontend/src/assets/velella-logo.png
```

#### 4. 啟動服務

```bash
# 同時啟動前後端
npm run dev

# 或分別啟動
cd backend && npm run dev   # Terminal 1
cd frontend && npm run dev  # Terminal 2
```

#### 5. 開啟瀏覽器

```
http://localhost:3000
```

---

## Vercel 部署

### 部署步驟

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入 Vercel
vercel login

# 3. 設定環境變數
vercel env add TESTNET_OBJECT_ID
# 輸入: 0xeeb34a78eaf4ae873c679db294296778676de4a335f222856716d1ad6ed54e45

# 4. 部署
vercel --prod
```

### Vercel 設定

| 設定 | 值 |
|------|-----|
| Build Command | `cd frontend && npm run build` |
| Output Directory | `frontend/dist` |
| Install Command | `npm install && cd frontend && npm install && cd ../backend && npm install` |

---

## API 端點

| 方法 | 路徑 | 說明 | 網路 |
|------|------|------|------|
| GET | `/api/health` | 健康檢查 | - |
| GET | `/api/wallet/:address/validate` | 驗證地址 | Mainnet |
| GET | `/api/wallet/:address/balance` | 查詢餘額 | Mainnet |
| GET | `/api/object/fixed` | 固定 Object | Testnet |
| GET | `/api/object/:objectId` | 動態 Object | Testnet |

---

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | Backend 服務埠 | 5000 |
| `SUI_MAINNET_RPC_URL` | Mainnet RPC URL | 官方免費節點 |
| `SUI_TESTNET_RPC_URL` | Testnet RPC URL | 官方免費節點 |
| `TESTNET_OBJECT_ID` | 固定 Object ID | - |

---

## 功能總覽

| UserStory | 功能 | 網路 | 狀態 |
|-----------|------|------|------|
| 1-1 | 連接錢包 + 顯示餘額 | Mainnet | ✅ |
| 1-2 | 查詢任意地址餘額 + 代幣 | Mainnet | ✅ |
| 3 | 讀取 Object 資料 | Testnet | ✅ |
| 4 | 發送 SUI 轉帳交易 | Testnet | ✅ |
