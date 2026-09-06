import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadOcrForSession } from '../../api/inventoryImportApi';
import styles from './MobileScannerPage.module.css';

/**
 * MobileScannerPage - Trang di động siêu nhẹ dành riêng cho nhân viên kho
 * chụp ảnh phiếu giao hàng / hóa đơn từ điện thoại.
 * Route: /m/scan
 *
 * Thiết kế Mobile-First, tải nhanh, nút bấm to dễ thao tác 1 tay.
 * Hỗ trợ chụp liên tục nhiều phiếu mà không cần quét lại QR.
 */
export default function MobileScannerPage() {
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [message, setMessage] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const fileInputRef = useRef(null);
  
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session');

  const handleCapture = useCallback(async (e) => {
    if (!sessionId) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatus('uploading');
    setMessage('Đang gửi ảnh lên hệ thống...');

    try {
      await uploadOcrForSession(sessionId, file);
      setSentCount((prev) => prev + 1);
      setStatus('success');
      setMessage(`✅ Đã gửi ảnh thành công! Vui lòng nhìn lên màn hình máy tính.`);
    } catch (err) {
      setStatus('error');
      setMessage('❌ Gửi thất bại. Vui lòng thử lại.');
      console.error('Mobile OCR error:', err);
    }
  }, [sentCount, sessionId]);

  const triggerCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!sessionId) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>❌ Thiếu phiên kết nối</h2>
        <p>Vui lòng mở tính năng <b>"Quét hóa đơn AI"</b> trên máy tính, sau đó dùng Zalo hoặc ứng dụng Camera quét mã QR hiển thị trên màn hình máy tính.</p>
      </div>
    );
  }



  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>📦 DLC-WMS</div>
        <div className={styles.subtitle}>Máy quét chứng từ AI</div>
      </div>

      {/* Status Card */}
      <div className={styles.statusCard}>
        <div className={styles.statusIcon}>
          {status === 'idle' && '📷'}
          {status === 'uploading' && '⏳'}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
        </div>
        <p className={styles.statusText}>
          {status === 'idle' && 'Sẵn sàng chụp phiếu giao hàng'}
          {status !== 'idle' && message}
        </p>
        {sentCount > 0 && (
          <p className={styles.counter}>Đã gửi: {sentCount} phiếu</p>
        )}
      </div>

      {/* Main Capture Button */}
      <button
        className={styles.captureBtn}
        onClick={triggerCamera}
        disabled={status === 'uploading'}
      >
        {status === 'uploading' ? (
          <span className={styles.spinnerInline} />
        ) : (
          '📷'
        )}
        <span>{status === 'uploading' ? 'Đang gửi...' : 'Chụp / Chọn ảnh hóa đơn'}</span>
      </button>

      {/* Instructions */}
      <div className={styles.instructions}>
        <p>📋 Hướng dẫn:</p>
        <ol>
          <li>Nhấn nút <strong>"Chụp"</strong> bên trên</li>
          <li>Chụp ảnh phiếu giao hàng / hóa đơn</li>
          <li>AI sẽ tự động trích xuất và đẩy về màn hình PC</li>
          <li>Bạn có thể chụp liên tiếp nhiều phiếu</li>
        </ol>
      </div>

      {/* Hidden camera input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCapture}
      />
    </div>
  );
}
