import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export interface BalanceInfo {
  coinType: string
  totalBalance: string
}

export interface WalletBalanceResponse {
  address: string
  suiBalance: string
  tokens: BalanceInfo[]
}

export interface ObjectFieldsResponse {
  objectId: string
  fields: Record<string, unknown> | null
  error?: string
}

/**
 * 查詢錢包餘額 (Mainnet)
 */
export async function getWalletBalance(address: string): Promise<WalletBalanceResponse> {
  const response = await api.get<WalletBalanceResponse>(`/wallet/${address}/balance`)
  return response.data
}

/**
 * 讀取 Object 資料 (Testnet)
 */
export async function getObject(objectId: string): Promise<ObjectFieldsResponse> {
  const response = await api.get<ObjectFieldsResponse>(`/object/${objectId}`)
  return response.data
}

export default api
