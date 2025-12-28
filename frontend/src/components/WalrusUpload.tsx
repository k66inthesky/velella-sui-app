import { useState, useRef } from 'react'
import { toHex, fromHex } from '@mysten/sui/utils'

// Walrus 去中心化儲存 + AES-256-GCM 加密
function WalrusUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [uploadedBlob, setUploadedBlob] = useState<{
    blobId: string
    size: number
    filename: string
    isEncrypted: boolean
    encryptionId?: string
    backupKey?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enableEncryption, setEnableEncryption] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Walrus Testnet Publisher
  const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space'
  const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space'

  // AES-256-GCM 加密函數
  const encryptData = async (data: Uint8Array): Promise<{ encrypted: Uint8Array; key: Uint8Array; iv: Uint8Array }> => {
    // 生成 256-bit 密鑰
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    
    // 生成 12-byte IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // 加密
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    // 導出密鑰
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    
    return {
      encrypted: new Uint8Array(encrypted),
      key: new Uint8Array(exportedKey),
      iv
    }
  }

  // AES-256-GCM 解密函數
  const decryptData = async (encrypted: Uint8Array, keyBytes: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    return new Uint8Array(decrypted)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    try {
      let dataToUpload: Uint8Array | File = selectedFile
      let encryptionId: string | undefined
      let backupKey: string | undefined

      // 如果啟用加密，使用 AES-256-GCM 加密檔案
      if (enableEncryption) {
        const fileBuffer = await selectedFile.arrayBuffer()
        const fileData = new Uint8Array(fileBuffer)
        
        console.log('原始檔案大小:', fileData.length)
        
        // 加密檔案
        const { encrypted, key, iv } = await encryptData(fileData)
        
        console.log('加密後大小:', encrypted.length)
        console.log('IV:', toHex(iv))
        
        // 將 IV 附加到加密資料前面 (12 bytes IV + encrypted data)
        const encryptedWithIv = new Uint8Array(iv.length + encrypted.length)
        encryptedWithIv.set(iv, 0)
        encryptedWithIv.set(encrypted, iv.length)
        
        console.log('總上傳大小 (IV + 加密資料):', encryptedWithIv.length)
        
        dataToUpload = encryptedWithIv
        encryptionId = toHex(iv)
        backupKey = toHex(key)
      }

      // 上傳到 Walrus
      const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
        method: 'PUT',
        body: dataToUpload,
      })

      if (!response.ok) {
        throw new Error(`上傳失敗: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Walrus 回應:', result)
      
      // Walrus 回傳的結構可能是 newlyCreated 或 alreadyCertified
      const blobInfo = result.newlyCreated?.blobObject || result.alreadyCertified?.blobObject || result
      const blobId = blobInfo?.blobId || result.newlyCreated?.blobObject?.blobId || result.blobId

      if (!blobId) {
        throw new Error('無法取得 Blob ID')
      }

      console.log('上傳成功, Blob ID:', blobId)
      console.log('是否加密:', enableEncryption)

      setUploadedBlob({
        blobId,
        size: selectedFile.size,
        filename: selectedFile.name,
        isEncrypted: enableEncryption,
        encryptionId,
        backupKey,
      })
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async () => {
    if (!uploadedBlob) return
    
    console.log('=== 下載開始 ===')
    console.log('uploadedBlob:', uploadedBlob)
    console.log('isEncrypted:', uploadedBlob.isEncrypted)
    console.log('backupKey:', uploadedBlob.backupKey)
    
    // 如果是加密檔案，嘗試解密
    if (uploadedBlob.isEncrypted && uploadedBlob.backupKey) {
      setIsDecrypting(true)
      try {
        // 下載加密的 blob
        console.log('正在從 Walrus 下載加密資料...')
        const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${uploadedBlob.blobId}`)
        if (!response.ok) throw new Error('下載失敗')
        
        const encryptedWithIv = new Uint8Array(await response.arrayBuffer())
        console.log('下載的資料大小:', encryptedWithIv.length)
        console.log('前 20 bytes (hex):', Array.from(encryptedWithIv.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '))
        
        // 分離 IV 和加密資料 (前 12 bytes 是 IV)
        const iv = encryptedWithIv.slice(0, 12)
        const encryptedData = encryptedWithIv.slice(12)
        console.log('IV:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(' '))
        console.log('加密資料大小:', encryptedData.length)
        
        // 解密
        const keyBytes = fromHex(uploadedBlob.backupKey)
        console.log('開始解密...')
        const decryptedData = await decryptData(encryptedData, keyBytes, iv)
        console.log('解密後大小:', decryptedData.length)
        
        // 下載解密後的檔案
        const blob = new Blob([decryptedData])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = uploadedBlob.filename
        a.click()
        URL.revokeObjectURL(url)
        console.log('=== 解密下載完成 ===')
      } catch (err) {
        console.error('解密錯誤:', err)
        setError('解密失敗：' + (err instanceof Error ? err.message : '未知錯誤'))
      } finally {
        setIsDecrypting(false)
      }
    } else {
      console.log('非加密模式，直接下載')
      // 非加密檔案直接下載
      const url = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${uploadedBlob.blobId}`
      window.open(url, '_blank')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>🦭 Walrus + AES 加密儲存</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ padding: '4px 12px', backgroundColor: '#6366f1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Testnet</span>
          <span style={{ padding: '4px 12px', backgroundColor: '#10b981', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>AES-256</span>
        </div>
      </div>
      <p className="description">
        使用 AES-256-GCM 加密後上傳到 Walrus 去中心化儲存網路
      </p>

      {/* 加密開關 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: enableEncryption ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: `1px solid ${enableEncryption ? '#10b981' : 'var(--border)'}`
      }}>
        <input 
          type="checkbox" 
          id="encryption-toggle"
          checked={enableEncryption}
          onChange={(e) => setEnableEncryption(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="encryption-toggle" style={{ cursor: 'pointer', flex: 1 }}>
          <span style={{ fontWeight: 'bold', color: enableEncryption ? '#10b981' : 'var(--text-muted)' }}>
            {enableEncryption ? '🔒 AES-256 加密已啟用' : '🔓 未加密'}
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {enableEncryption ? '檔案將使用 AES-256-GCM 加密保護' : '檔案將以原始形式上傳'}
          </p>
        </label>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* 上傳區域 */}
      <div 
        className="upload-zone"
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          marginBottom: '24px'
        }}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
        />
        
        {selectedFile ? (
          <div>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📄</p>
            <p style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
              {selectedFile.name}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📁</p>
            <p style={{ color: 'var(--text-muted)' }}>
              點擊選擇檔案上傳
            </p>
          </div>
        )}
        
        <label 
          htmlFor="file-input"
          style={{
            display: 'inline-block',
            marginTop: '16px',
            padding: '12px 24px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
        >
          選擇檔案
        </label>
      </div>

      {/* 上傳按鈕 */}
      {selectedFile && (
        <button 
          onClick={handleUpload}
          disabled={isUploading}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            backgroundColor: enableEncryption ? '#10b981' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            marginBottom: '24px'
          }}
        >
          {isUploading 
            ? (enableEncryption ? '🔐 加密並上傳中...' : '上傳中...') 
            : (enableEncryption ? '🔐 加密並上傳到 Walrus' : '🚀 上傳到 Walrus')}
        </button>
      )}

      {/* 上傳結果 */}
      {uploadedBlob && (
        <div className="result-card">
          <h3>{uploadedBlob.isEncrypted ? '🔐 加密上傳成功' : '✅ 上傳成功'}</h3>
          
          {uploadedBlob.isEncrypted && (
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #10b981'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#10b981' }}>
                🔒 此檔案已使用 AES-256-GCM 加密
              </p>
            </div>
          )}
          
          <div className="result-item">
            <span className="result-label">檔案名稱</span>
            <span className="result-value">{uploadedBlob.filename}</span>
          </div>
          <div className="result-item">
            <span className="result-label">檔案大小</span>
            <span className="result-value">{formatFileSize(uploadedBlob.size)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Blob ID</span>
            <span className="result-value" style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
              {uploadedBlob.blobId}
            </span>
          </div>
          
          {uploadedBlob.isEncrypted && uploadedBlob.backupKey && (
            <div className="result-item" style={{ marginTop: '12px' }}>
              <span className="result-label">🔑 備份金鑰 (請妥善保管！)</span>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                backgroundColor: 'rgba(255, 200, 0, 0.1)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 200, 0, 0.3)'
              }}>
                <span className="result-value" style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '10px', 
                  wordBreak: 'break-all',
                  flex: 1
                }}>
                  {uploadedBlob.backupKey}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(uploadedBlob.backupKey!)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ffc800',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  複製
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#ffc800', marginTop: '4px' }}>
                ⚠️ 此金鑰是解密檔案的唯一方式，遺失將無法恢復！
              </p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button 
              onClick={handleDownload}
              disabled={isDecrypting}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isDecrypting ? 'not-allowed' : 'pointer'
              }}
            >
              {isDecrypting ? '解密中...' : '🔓 解密並下載'}
            </button>
            <button 
              onClick={() => {
                const url = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${uploadedBlob.blobId}`
                window.open(url, '_blank')
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔒 查看加密原始檔
            </button>
          </div>
          
          {/* 加密驗證說明 */}
          {uploadedBlob.isEncrypted && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontSize: '12px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#818cf8' }}>
                🔍 如何驗證加密有效？
              </p>
              <p style={{ margin: '0 0 4px 0', color: 'var(--text-muted)' }}>
                • 點擊「查看加密原始檔」→ 會顯示亂碼/無法開啟的檔案
              </p>
              <p style={{ margin: '0 0 4px 0', color: 'var(--text-muted)' }}>
                • 點擊「解密並下載」→ 會得到原始的可正常開啟的檔案
              </p>
              <p style={{ margin: '0', color: 'var(--text-muted)' }}>
                • 這證明 Walrus 上儲存的是加密資料，只有擁有金鑰才能解密
              </p>
            </div>
          )}
        </div>
      )}

      {/* 說明 */}
      <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
        <p>💡 Walrus 是 Sui 生態的去中心化儲存解決方案</p>
        <p>🔐 AES-256-GCM 是業界標準的對稱加密演算法</p>
        <p>🔑 備份金鑰用於解密，遺失將無法恢復檔案</p>
        <p>🌐 透過 Blob ID 可以從任何地方存取加密檔案</p>
      </div>
    </div>
  )
}

export default WalrusUpload
