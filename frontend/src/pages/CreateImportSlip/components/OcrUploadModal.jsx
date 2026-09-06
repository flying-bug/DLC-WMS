import { useState, useRef, useCallback, useEffect } from 'react';
import { initOcrSession, getOcrSessionState } from '../../../api/inventoryImportApi';
import styles from './OcrUploadModal.module.css';

/**
 * OcrUploadModal - Modal cho phép upload ảnh chứng từ nhập kho để OCR trích xuất tự động.
 * Hỗ trợ: Drag & Drop, File Picker, Clipboard, Mobile QR Sync.
 */
export default function OcrUploadModal({ open, onClose, onFileSelected, loading, onOcrSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  
  // Trạng thái cho tính năng đồng bộ Mobile
  const [showQR, setShowQR] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [mobileStatus, setMobileStatus] = useState(''); // 'PROCESSING' hoặc 'ERROR'
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Chỉ hỗ trợ file ảnh (JPG, PNG, WEBP) hoặc PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 10MB.');
      return;
    }
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
    onFileSelected(file);
  }, [onFileSelected]);

  // Ctrl + V Paste Listener
  useEffect(() => {
    if (!open) {
      setPreview(null);
      setShowQR(false);
      setSessionId('');
      setMobileStatus('');
      return;
    }
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open]);

  // Polling logic cho Mobile QR Sync
  useEffect(() => {
    if (!open || !sessionId) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await getOcrSessionState(sessionId);
        const state = res?.data?.data || res?.data;
        if (state) {
          if (state.status === 'PROCESSING') {
            setMobileStatus('PROCESSING');
          } else if (state.status === 'SUCCESS' && state.result) {
            clearInterval(interval);
            setMobileStatus('');
            // Đẩy dữ liệu ra ngoài thông qua prop mới `onOcrSuccess`
            onOcrSuccess(state.result);
          } else if (state.status === 'ERROR') {
            setMobileStatus('ERROR');
            alert('Lỗi xử lý ảnh từ điện thoại: ' + (state.errorMessage || 'Lỗi không xác định'));
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000); // 2 giây gọi 1 lần

    return () => clearInterval(interval);
  }, [open, sessionId, onOcrSuccess]);

  const handleOpenQR = async () => {
    try {
      setQrLoading(true);
      const res = await initOcrSession();
      const newSessionId = res?.data?.data || res?.data;
      if (newSessionId) {
        setSessionId(newSessionId);
        setShowQR(true);
      }
    } catch (err) {
      alert('Không thể tạo mã QR. Vui lòng thử lại.');
    } finally {
      setQrLoading(false);
    }
  };



  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>🤖 Quét chứng từ nhập kho bằng AI</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          {/* Main Area: Dropzone hoặc QR Code */}
          {!showQR ? (
            <div
              className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                  <p>Đang phân tích chứng từ bằng AI...</p>
                </div>
              ) : preview ? (
                <img src={preview} alt="Preview" className={styles.previewImg} />
              ) : (
                <div className={styles.placeholder}>
                  <span className={styles.icon}>📄</span>
                  <p className={styles.mainText}>Kéo thả ảnh hóa đơn / phiếu giao hàng vào đây</p>
                  <p className={styles.subText}>hoặc nhấn để chọn file • Ctrl + V để dán ảnh</p>
                  <p className={styles.formatText}>Hỗ trợ: JPG, PNG, WEBP, PDF (tối đa 10MB)</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.qrContainer} style={{ textAlign: 'center', padding: '20px 0' }}>
              {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (
                <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <h4 style={{ color: '#dc2626', marginBottom: '8px' }}>⚠️ Lỗi: Không thể dùng localhost</h4>
                  <p style={{ color: '#991b1b', marginBottom: '16px' }}>
                    Điện thoại không thể quét mã QR có địa chỉ <b>localhost</b>. Vui lòng mở lại trang web này trên máy tính bằng địa chỉ IP mạng Wi-Fi của bạn.<br/>
                    <i>Ví dụ: http://192.168.1.45:5173</i>
                  </p>
                  <button className={styles.actionBtn} onClick={() => setShowQR(false)} style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                    Đã hiểu, quay lại
                  </button>
                </div>
              ) : mobileStatus === 'PROCESSING' ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} style={{ margin: '0 auto 16px' }} />
                  <h4 style={{ color: '#2563eb', margin: '10px 0' }}>Đang nhận dữ liệu từ điện thoại...</h4>
                  <p>AI đang phân tích ảnh hóa đơn, vui lòng chờ trong giây lát.</p>
                </div>
              ) : (
                <>
                  <h4 style={{ color: '#2563eb', marginBottom: '16px' }}>Quét mã để chụp ảnh trên điện thoại</h4>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/m/scan?session=' + sessionId)}`} 
                    alt="QR Code" 
                    style={{ border: '8px solid white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <p style={{ marginTop: '16px', color: '#64748b' }}>
                    1. Mở camera điện thoại hoặc Zalo để quét.<br/>
                    2. Chụp ảnh hóa đơn.<br/>
                    3. Máy tính sẽ tự động nhận dữ liệu!
                  </p>
                  <button className={styles.actionBtn} onClick={() => setShowQR(false)} style={{ marginTop: '16px', backgroundColor: '#f1f5f9', color: '#334155' }}>
                    Quay lại tải file
                  </button>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!showQR && (
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                📁 Tải file lên
              </button>
              <button
                className={styles.actionBtn}
                style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
                onClick={handleOpenQR}
                disabled={loading || qrLoading}
              >
                {qrLoading ? 'Đang tạo QR...' : '📱 Quét bằng điện thoại'}
              </button>
            </div>
          )}

          <p className={styles.hint}>
            💡 Mẹo: Nhấn <kbd>Ctrl</kbd> + <kbd>V</kbd> để dán ảnh trực tiếp từ Clipboard
          </p>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
}
