import { useState, useRef, useCallback, useEffect } from 'react';
import { initOcrSession, getOcrSessionStreamUrl } from '../../../api/inventoryImportApi';
import { compressImageForOcr } from '../../../utils/imageCompressor';
import styles from './OcrUploadModal.module.css';

/**
 * OcrUploadModal - Modal cho phép upload ảnh chứng từ nhập kho để OCR trích xuất tự động.
 * Hỗ trợ: Drag & Drop, File Picker, Clipboard, Mobile QR Sync.
 */
export default function OcrUploadModal({ open, onClose, onFileSelected, loading, onOcrSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  
  // Trạng thái cho tính năng đồng bộ Mobile
  const [showQR, setShowQR] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false); // điện thoại đã mở liên kết QR -> ẩn mã QR
  const [showQrAgain, setShowQrAgain] = useState(false);
  const [pages, setPages] = useState([]); // các trang điện thoại đã chụp: { index, status, previewImage, result, errorMessage }
  const [excludedPages, setExcludedPages] = useState([]); // index các trang người dùng bỏ khỏi lần gộp
  const [zoomedPage, setZoomedPage] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const latestOnOcrSuccess = useRef(onOcrSuccess);

  useEffect(() => {
    latestOnOcrSuccess.current = onOcrSuccess;
  }, [onOcrSuccess]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Chỉ hỗ trợ file ảnh (JPG, PNG, WEBP) hoặc PDF.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 25MB.');
      return;
    }

    let fileToProcess = file;
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
      setCompressing(true);
      try {
        fileToProcess = await compressImageForOcr(file, { maxWidth: 1800, maxHeight: 1800, quality: 0.85 });
      } catch (err) {
        console.warn('Lỗi nén ảnh phía client, sử dụng file gốc:', err);
      } finally {
        setCompressing(false);
      }
    } else {
      setPreview(null);
    }
    onFileSelected(fileToProcess);
  }, [onFileSelected]);

  // Ctrl + V Paste Listener
  useEffect(() => {
    if (!open) {
      setPreview(null);
      setShowQR(false);
      setSessionId('');
      setPhoneConnected(false);
      setShowQrAgain(false);
      setPages([]);
      setExcludedPages([]);
      setZoomedPage(null);
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

  // Nhận trạng thái phiên quét Mobile QR qua SSE thay vì polling mỗi 2s.
  useEffect(() => {
    if (!open || !sessionId) return;

    const eventSource = new EventSource(getOcrSessionStreamUrl(sessionId));

    // Trạng thái phiên: điện thoại đã quét QR chưa.
    eventSource.addEventListener('ocr-status', (event) => {
      try {
        const state = JSON.parse(event.data);
        if (state?.status === 'CONNECTED') setPhoneConnected(true);
      } catch (err) {
        console.error('Khong the doc trang thai phien OCR:', err);
      }
    });

    // Mỗi trang chụp được gửi nhiều lần (đang xử lý -> kết quả; phát lại khi SSE nối lại).
    // Định danh theo index nên chỉ ghi đè, không bao giờ nhân đôi.
    eventSource.addEventListener('ocr-page', (event) => {
      try {
        const page = JSON.parse(event.data);
        if (!page?.index) return;
        setPhoneConnected(true);
        setPages((prev) => [...prev.filter((p) => p.index !== page.index), page].sort((a, b) => a.index - b.index));
      } catch (err) {
        console.error('Khong the doc trang OCR:', err);
      }
    });

    eventSource.onerror = () => {
      console.error('OCR session stream error');
    };

    return () => eventSource.close();
  }, [open, sessionId]);

  const usablePages = pages.filter((p) => p.status === 'SUCCESS' && p.result && !excludedPages.includes(p.index));
  const hasProcessingPage = pages.some((p) => p.status === 'PROCESSING' && !excludedPages.includes(p.index));
  const toggleExcluded = (index) => {
    setExcludedPages((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const handleFinishBatch = () => {
    if (usablePages.length === 0) {
      setShowQR(false);
      return;
    }
    const batchResults = usablePages.map((p) => p.result);

    // Các trang thuộc cùng một hóa đơn thì mới được gộp
    const invoiceCodes = [...new Set(batchResults.map(r => r.invoiceCode).filter(c => c && c.trim() !== ''))];
    if (invoiceCodes.length > 1) {
      alert(`Phát hiện nhiều số hóa đơn khác nhau (${invoiceCodes.join(', ')}). Vui lòng bỏ bớt các trang không cùng hóa đơn, hoặc quét và tạo phiếu nhập riêng cho từng hóa đơn!`);
      return;
    }

    // Merge: lấy thông tin chung ở trang đầu (bổ sung từ trang sau nếu trang đầu thiếu), gộp toàn bộ dòng hàng
    const mergedResult = { ...batchResults[0] };
    mergedResult.invoiceCode = invoiceCodes.length === 1 ? invoiceCodes[0] : '';
    batchResults.slice(1).forEach((r) => {
      if (!mergedResult.matchedSupplierId && r.matchedSupplierId) {
        mergedResult.matchedSupplierId = r.matchedSupplierId;
        mergedResult.matchedSupplierName = r.matchedSupplierName;
        mergedResult.matchedSupplierCode = r.matchedSupplierCode;
      }
      if (!mergedResult.invoiceDate && r.invoiceDate) mergedResult.invoiceDate = r.invoiceDate;
    });

    const allItems = [];
    batchResults.forEach(r => {
      if (r.items && Array.isArray(r.items)) {
        allItems.push(...r.items);
      }
    });
    mergedResult.items = allItems;
    
    setShowQR(false);
    latestOnOcrSuccess.current(mergedResult);
  };

  const handleOpenQR = async () => {
    try {
      setQrLoading(true);
      const res = await initOcrSession();
      const newSessionId = res?.data?.data || res?.data;
      if (newSessionId) {
        // Phiên mới: xóa trạng thái của phiên trước (điện thoại chưa kết nối, chưa có trang nào)
        setPhoneConnected(false);
        setShowQrAgain(false);
        setPages([]);
        setExcludedPages([]);
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
              {compressing ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                  <p>⚙️ Đang tối ưu hóa dung lượng ảnh...</p>
                  <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)' }}>Nén về chuẩn 1800px để xử lý siêu tốc</span>
                </div>
              ) : loading ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                  <p>⚡ AI đang quét & trích xuất dữ liệu...</p>
                  <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)' }}>Thời gian phản hồi ~2–3 giây</span>
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
                  <h4 style={{ color: 'var(--wms-danger)', marginBottom: '8px' }}>⚠️ Lỗi: Không thể dùng localhost</h4>
                  <p style={{ color: '#991b1b', marginBottom: '16px' }}>
                    Điện thoại không thể quét mã QR có địa chỉ <b>localhost</b>. Vui lòng mở lại trang web này trên máy tính bằng địa chỉ IP mạng Wi-Fi của bạn.<br/>
                    <i>Ví dụ: http://192.168.1.45:5173</i>
                  </p>
                  <button className={styles.actionBtn} onClick={() => setShowQR(false)} style={{ backgroundColor: 'var(--wms-bg-hover)', color: 'var(--wms-text-body)' }}>
                    Đã hiểu, quay lại
                  </button>
                </div>
              ) : phoneConnected && !showQrAgain ? (
                <>
                  {/* Điện thoại đã quét QR: mã QR biến mất, chỉ còn các ảnh đã chụp và kết quả AI */}
                  <div className={styles.connectedBanner}>
                    📱 Điện thoại đã kết nối
                    <span>{pages.length === 0 ? 'Hãy chụp ảnh hóa đơn trên điện thoại...' : `Đã nhận ${pages.length} ảnh`}</span>
                  </div>

                  {pages.length > 0 && (
                    <div className={styles.pageGrid}>
                      {pages.map((page) => {
                        const excluded = excludedPages.includes(page.index);
                        return (
                          <div key={page.index} className={`${styles.pageCard} ${excluded ? styles.pageExcluded : ''}`}>
                            <button
                              type="button"
                              className={styles.pageThumb}
                              onClick={() => page.previewImage && setZoomedPage(page)}
                              title={page.previewImage ? 'Bấm để phóng to' : ''}
                            >
                              {page.previewImage
                                ? <img src={page.previewImage} alt={`Trang ${page.index}`} />
                                : <span>📄</span>}
                              {page.status === 'PROCESSING' && (
                                <div className={styles.pageOverlay}>
                                  <div className={styles.spinner} />
                                  <span>AI đang đọc...</span>
                                </div>
                              )}
                            </button>
                            <div className={styles.pageMeta}>
                              <b>Trang {page.index}</b>
                              {page.status === 'SUCCESS' && (
                                <span className={styles.pageOk}>✓ {page.result?.items?.length || 0} dòng hàng</span>
                              )}
                              {page.status === 'PROCESSING' && <span className={styles.pageWait}>Đang xử lý</span>}
                              {page.status === 'ERROR' && (
                                <span className={styles.pageErr} title={page.errorMessage || ''}>
                                  ✕ {page.errorMessage || 'Không đọc được ảnh'}
                                </span>
                              )}
                              {page.status !== 'PROCESSING' && (
                                <button type="button" className={styles.pageRemove} onClick={() => toggleExcluded(page.index)}>
                                  {excluded ? 'Dùng lại' : 'Bỏ trang này'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {usablePages.length > 0 && (
                    <button
                      className={styles.actionBtn}
                      onClick={handleFinishBatch}
                      disabled={hasProcessingPage}
                      style={{ backgroundColor: '#10b981', color: 'white', width: '100%', borderColor: '#10b981', marginTop: '16px' }}
                    >
                      {hasProcessingPage ? 'Đang chờ AI đọc xong...' : `Hoàn tất & Gộp dữ liệu (${usablePages.length} trang)`}
                    </button>
                  )}

                  <div className={styles.connectedLinks}>
                    <button type="button" className={styles.linkBtn} onClick={() => setShowQrAgain(true)}>Hiện lại mã QR</button>
                    <button type="button" className={styles.linkBtn} onClick={() => setShowQR(false)}>Quay lại tải file</button>
                  </div>
                </>
              ) : (
                <>
                  <h4 style={{ color: 'var(--wms-primary)', marginBottom: '16px' }}>Quét mã để chụp ảnh trên điện thoại</h4>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/m/scan?session=' + sessionId)}`} 
                    alt="QR Code" 
                    style={{ border: '8px solid white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <p style={{ marginTop: '16px', color: 'var(--wms-text-muted)' }}>
                    1. Mở camera điện thoại hoặc Zalo để quét.<br/>
                    2. Chụp ảnh hóa đơn (có thể chụp liên tiếp nhiều trang).<br/>
                    3. Máy tính sẽ tự động nhận dữ liệu!
                  </p>

                  {phoneConnected && (
                    <button className={styles.actionBtn} onClick={() => setShowQrAgain(false)} style={{ marginTop: '16px', backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}>
                      Xem các ảnh đã chụp ({pages.length})
                    </button>
                  )}

                  <button className={styles.actionBtn} onClick={() => setShowQR(false)} style={{ marginTop: '16px', backgroundColor: 'var(--wms-bg-hover)', color: 'var(--wms-text-body)' }}>
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
                style={{ backgroundColor: 'var(--wms-primary)', color: 'white', borderColor: 'var(--wms-primary)' }}
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

        {zoomedPage && (
          <div className={styles.zoomOverlay} onClick={() => setZoomedPage(null)}>
            <img src={zoomedPage.previewImage} alt={`Trang ${zoomedPage.index}`} />
          </div>
        )}

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
