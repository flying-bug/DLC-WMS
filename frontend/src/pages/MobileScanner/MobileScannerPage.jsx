import { useState, useRef, useCallback, useEffect } from 'react';
import { joinOcrSession, uploadOcrForSession } from '../../api/inventoryImportApi';
import { compressImage, compressImageForOcr } from '../../utils/imageCompressor';
import styles from './MobileScannerPage.module.css';

// Camera trực tiếp trong trang cần HTTPS + trình duyệt hỗ trợ getUserMedia.
const canUseLiveCamera = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;

/**
 * MobileScannerPage - Trang di động siêu nhẹ dành riêng cho nhân viên kho
 * chụp ảnh phiếu giao hàng / hóa đơn từ điện thoại.
 * Route: /m/scan
 *
 * Thiết kế Mobile-First, tải nhanh, nút bấm to dễ thao tác 1 tay.
 * - Mở camera ngay trong trang (như ứng dụng quét chứng từ): chụp liên tiếp nhiều trang mà không phải
 *   mở lại ứng dụng máy ảnh. Trình duyệt trong Zalo bỏ qua <input capture> nên chỉ hiện hộp chọn ảnh;
 *   camera trong trang khắc phục điều đó.
 * - Không dùng được camera trong trang (HTTP, bị từ chối quyền...) thì rơi về ứng dụng máy ảnh / thư viện ảnh.
 * - Vừa mở trang là báo về máy tính (join) để mã QR trên máy tính tự tắt.
 */
export default function MobileScannerPage() {
  const [pending, setPending] = useState(0); // số ảnh đang nén/gửi
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [message, setMessage] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const [lastPhoto, setLastPhoto] = useState(null); // URL ảnh vừa chụp, hiện lại trên điện thoại
  const [sessionError, setSessionError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const captureInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastPhotoRef = useRef(null);

  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session');

  useEffect(() => {
    if (!sessionId) return;
    joinOcrSession(sessionId).catch((err) => {
      console.error('Mobile OCR join error:', err);
      setSessionError('Phiên quét đã hết hạn hoặc không tồn tại. Vui lòng bấm "Quét bằng điện thoại" lại trên máy tính để lấy mã QR mới.');
    });
  }, [sessionId]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  // Giải phóng camera + URL ảnh khi rời trang.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (lastPhotoRef.current) URL.revokeObjectURL(lastPhotoRef.current);
  }, []);

  // Gắn luồng camera vào thẻ <video> sau khi nó được render.
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  const sendPhoto = useCallback(async (file) => {
    if (!sessionId || !file) return;

    setPending((n) => n + 1);
    setStatus('uploading');
    setMessage('Đang gửi ảnh lên hệ thống...');

    if (lastPhotoRef.current) URL.revokeObjectURL(lastPhotoRef.current);
    lastPhotoRef.current = URL.createObjectURL(file);
    setLastPhoto(lastPhotoRef.current);

    try {
      // Nén trên điện thoại: gửi nhanh hơn qua 4G, và tạo ảnh thu nhỏ (đã xoay đúng chiều) cho máy tính hiển thị.
      const [photo, thumbnail] = await Promise.all([
        compressImageForOcr(file),
        compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 }),
      ]);
      await uploadOcrForSession(sessionId, photo, thumbnail);
      setSentCount((prev) => prev + 1);
      setStatus('success');
      setMessage('Đã gửi ảnh! Vui lòng nhìn lên màn hình máy tính.');
    } catch (err) {
      setStatus('error');
      setMessage(err?.response?.data?.userMessage || 'Gửi thất bại. Vui lòng thử lại.');
      console.error('Mobile OCR error:', err);
    } finally {
      setPending((n) => n - 1);
    }
  }, [sessionId]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    sendPhoto(file);
  }, [sendPhoto]);

  const openCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      console.error('Mobile camera error:', err);
      setCameraError('Không mở được camera trong trang (chưa cấp quyền?). Dùng nút bên dưới để mở ứng dụng máy ảnh.');
    }
  }, []);

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) sendPhoto(new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }, [sendPhoto]);

  if (!sessionId) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <h2 style={{ color: 'var(--wms-danger)', marginBottom: '16px' }}>❌ Thiếu phiên kết nối</h2>
        <p>Vui lòng mở tính năng <b>"Quét hóa đơn AI"</b> trên máy tính, sau đó dùng Zalo hoặc ứng dụng Camera quét mã QR hiển thị trên màn hình máy tính.</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <h2 style={{ marginBottom: '16px' }}>⌛ Phiên quét không còn hiệu lực</h2>
        <p>{sessionError}</p>
      </div>
    );
  }

  const uploading = pending > 0;
  const liveCameraSupported = canUseLiveCamera();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>📦 DLC-WMS</div>
        <div className={styles.subtitle}>Máy quét chứng từ AI</div>
      </div>

      {/* Status Card */}
      <div className={styles.statusCard}>
        {lastPhoto ? (
          <img src={lastPhoto} alt="Ảnh vừa chụp" className={styles.lastPhoto} />
        ) : (
          <div className={styles.statusIcon}>📷</div>
        )}
        <p className={styles.statusText}>
          {status === 'idle' && '✅ Đã kết nối với máy tính. Sẵn sàng chụp hóa đơn!'}
          {status === 'uploading' && `⏳ ${message}`}
          {status === 'success' && `✅ ${message}`}
          {status === 'error' && `❌ ${message}`}
        </p>
        {sentCount > 0 && (
          <p className={styles.counter}>Đã gửi: {sentCount} trang</p>
        )}
      </div>

      {/* Main Capture Button: camera trong trang nếu có, không thì ứng dụng máy ảnh */}
      <button
        className={styles.captureBtn}
        onClick={liveCameraSupported ? openCamera : () => captureInputRef.current?.click()}
        disabled={!liveCameraSupported && uploading}
      >
        {!liveCameraSupported && uploading ? <span className={styles.spinnerInline} /> : '📷'}
        <span>{sentCount > 0 ? 'Chụp thêm trang khác' : 'Chụp hóa đơn'}</span>
      </button>

      {cameraError && <p className={styles.cameraError}>{cameraError}</p>}

      {/* Dự phòng: ứng dụng máy ảnh của điện thoại / thư viện ảnh */}
      <div className={styles.secondaryRow}>
        {liveCameraSupported && (
          <button type="button" className={styles.secondaryBtn} onClick={() => captureInputRef.current?.click()}>
            Dùng ứng dụng máy ảnh
          </button>
        )}
        <button type="button" className={styles.secondaryBtn} onClick={() => galleryInputRef.current?.click()}>
          🖼 Chọn ảnh từ thư viện
        </button>
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <p>📋 Hướng dẫn:</p>
        <ol>
          <li>Nhấn nút <strong>"Chụp hóa đơn"</strong> bên trên</li>
          <li>Đưa hóa đơn vào khung hình rồi bấm nút chụp tròn</li>
          <li>AI sẽ tự động trích xuất và đẩy về màn hình PC</li>
          <li>Hóa đơn nhiều trang: chụp lần lượt từng trang, camera vẫn mở</li>
        </ol>
      </div>

      {/* Camera trong trang, toàn màn hình */}
      {cameraOpen && (
        <div className={styles.cameraOverlay}>
          <video ref={videoRef} className={styles.cameraVideo} playsInline muted autoPlay />
          <div className={styles.cameraTop}>
            <span>{uploading ? '⏳ Đang gửi...' : sentCount > 0 ? `✅ Đã gửi ${sentCount} trang` : 'Đưa hóa đơn vào khung hình'}</span>
          </div>
          <div className={styles.cameraBar}>
            <div className={styles.cameraThumbWrap}>
              {lastPhoto && <img src={lastPhoto} alt="Ảnh vừa chụp" className={styles.cameraThumb} />}
            </div>
            <button type="button" className={styles.shutterBtn} onClick={takeSnapshot} aria-label="Chụp" />
            <button type="button" className={styles.cameraDone} onClick={stopCamera}>Xong</button>
          </div>
        </div>
      )}

      {/* Hidden inputs: ứng dụng máy ảnh (capture) và thư viện ảnh */}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  );
}
