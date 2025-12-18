import { useState, useEffect } from 'react'
import axios from 'axios'

interface ObjectData {
  admin: unknown
  id: unknown
  balance: unknown
}

interface ObjectResponse {
  objectId: string
  network: string
  data: ObjectData
  rawFields: Record<string, unknown>
}

function ObjectDisplay() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ObjectResponse | null>(null)

  useEffect(() => {
    fetchObjectData()
  }, [])

  const fetchObjectData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get<ObjectResponse>('/api/object/fixed')
      setData(response.data)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.response?.data?.error || err.message)
      } else {
        setError('無法取得 Object 資料')
      }
    } finally {
      setLoading(false)
    }
  }

  // 格式化顯示值
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return 'N/A'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <div className="section">
      <h2 className="section-title">📦 UserStory 3：Object 資料 (Testnet)</h2>
      
      {loading && (
        <div className="loading">載入中...</div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
          <button 
            onClick={fetchObjectData} 
            style={{ marginLeft: '12px', padding: '4px 12px', cursor: 'pointer' }}
          >
            重試
          </button>
        </div>
      )}

      {data && (
        <div className="wallet-info-card">
          <div className="info-row">
            <span className="info-label">🔗 Object ID</span>
            <span className="info-value" style={{ fontSize: '0.8rem' }}>
              {data.objectId}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">🌐 網路</span>
            <span className="info-value">{data.network}</span>
          </div>

          <h4 style={{ marginTop: '20px', marginBottom: '12px', color: '#4a90d9' }}>
            📋 Object Fields
          </h4>

          <div className="info-row">
            <span className="info-label">👤 Admin</span>
            <span className="info-value">
              {formatValue(data.data.admin)}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">🆔 Id</span>
            <span className="info-value">
              {formatValue(data.data.id)}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">💰 Balance</span>
            <span className="info-value balance-value">
              {formatValue(data.data.balance)}
            </span>
          </div>

          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', color: '#666' }}>
              📄 查看完整 Raw Fields
            </summary>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.85rem',
              marginTop: '8px'
            }}>
              {JSON.stringify(data.rawFields, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

export default ObjectDisplay
