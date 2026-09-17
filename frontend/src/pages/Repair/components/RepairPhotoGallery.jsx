import { useState, useRef, useCallback } from 'react';
import * as repairPhotoApi from '../../../api/repairPhotoApi';
import styles from './RepairPhotoGallery.module.css';

/**
 * Phase metadata
 */
const PHASES = [
    {
        key: 'INTAKE',
        label: 'Ảnh tiếp nhận',
        icon: '📥',
        description: 'Tình trạng thiết bị khi tiếp nhận',
        allowedStatuses: ['DRAFT', 'ASSIGNED'],
    },
    {
        key: 'DIAGNOSIS',
        label: 'Ảnh chẩn đoán',
        icon: '🔍',
        description: 'Hình ảnh trong quá trình chẩn đoán lỗi',
        allowedStatuses: ['ASSIGNED', 'QUOTATION_PENDING'],
    },
    {
        key: 'COMPLETION',
        label: 'Ảnh hoàn thành',
        icon: '✅',
        description: 'Tình trạng thiết bị sau khi sửa xong',
        allowedStatuses: ['UNDER_REPAIR', 'READY_FOR_DELIVERY'],
    },
];

const MAX_PHOTOS_PER_PHASE = 10;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';
const MAX_FILE_SIZE_MB = 5;

/**
 * Component gallery ảnh sửa chữa phân theo phase.
 *
 * Props:
 *   repairId        - ID của lệnh sửa chữa (required nếu không isNew)
 *   repairStatus    - Trạng thái hiện tại của lệnh ('DRAFT', 'ASSIGNED', ...)
 *   photos          - Mảng ảnh đã có (từ repair.photos - trả về API)
 *   isNew           - true nếu đang tạo mới (chưa có repairId)
 *   canEdit         - booleans { intake, diagnosis, completion }
 *   onPhotoUploaded - callback (phase, photoResponse)
 *   onPhotoDeleted  - callback (phase, photoId)
 */
export default function RepairPhotoGallery({
    repairId,
    repairStatus = 'DRAFT',
    photos = [],
    isNew = false,
    canEdit = { intake: true, diagnosis: false, completion: false },
    onPhotoUploaded,
    onPhotoDeleted,
}) {
    const [uploading, setUploading] = useState({}); // { INTAKE: true/false }
    const [lightbox, setLightbox] = useState(null); // { url, caption, phase, uploadedByName, watermarkedAt }
    const fileInputRefs = { INTAKE: useRef(null), DIAGNOSIS: useRef(null), COMPLETION: useRef(null) };

    const photosByPhase = useCallback((phase) => {
        return photos.filter(p => p.phase === phase);
    }, [photos]);

    const isPhaseUploadAllowed = (phase) => {
        const meta = PHASES.find(p => p.key === phase);
        if (!meta) return false;
        if (isNew && phase !== 'INTAKE') return false;
        if (!meta.allowedStatuses.includes(repairStatus)) return false;
        const editKey = phase.toLowerCase();
        if (phase === 'INTAKE') return canEdit.intake;
        if (phase === 'DIAGNOSIS') return canEdit.diagnosis;
        if (phase === 'COMPLETION') return canEdit.completion;
        return false;
    };

    const isPhaseFullyLocked = (phase) => {
        const list = photosByPhase(phase);
        return list.length > 0 && list.every(p => p.locked);
    };

    const handleFileSelect = (phase) => {
        if (!isPhaseUploadAllowed(phase)) return;
        if (fileInputRefs[phase]?.current) fileInputRefs[phase].current.click();
    };

    const handleFileChange = async (phase, e) => {
        const file = e.target.files?.[0];
        if (!e.target) return;
        e.target.value = ''; // Reset để có thể chọn lại cùng file

        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            alert(`Kích thước file tối đa là ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP).');
            return;
        }

        // Count current photos
        const current = photosByPhase(phase).length;
        if (current >= MAX_PHOTOS_PER_PHASE) {
            alert(`Mỗi giai đoạn tối đa ${MAX_PHOTOS_PER_PHASE} ảnh.`);
            return;
        }

        if (!repairId && !isNew) {
            alert('Vui lòng lưu lệnh sửa chữa trước khi upload ảnh.');
            return;
        }

        setUploading(prev => ({ ...prev, [phase]: true }));
        try {
            const res = await repairPhotoApi.uploadRepairPhoto(repairId, phase, file);
            const uploaded = res?.data?.data ?? res?.data;
            if (onPhotoUploaded) onPhotoUploaded(phase, uploaded);
        } catch (err) {
            const msg = err.response?.data?.userMessage || err.response?.data?.message || 'Upload ảnh thất bại';
            alert(msg);
        } finally {
            setUploading(prev => ({ ...prev, [phase]: false }));
        }
    };

    const handleDelete = async (phase, photoId, locked) => {
        if (locked) {
            alert('Ảnh đã bị khóa sau khi chuyển giai đoạn, không thể xóa.');
            return;
        }
        if (!window.confirm('Xóa ảnh này?')) return;
        try {
            await repairPhotoApi.deleteRepairPhoto(repairId, photoId);
            if (onPhotoDeleted) onPhotoDeleted(phase, photoId);
        } catch (err) {
            const msg = err.response?.data?.userMessage || err.response?.data?.message || 'Không thể xóa ảnh';
            alert(msg);
        }
    };

    const openLightbox = (photo) => {
        setLightbox({
            url: photo.secureUrl,
            caption: photo.caption,
            phase: photo.phase,
            uploadedByName: photo.uploadedByName,
            watermarkedAt: photo.watermarkedAt,
        });
    };

    const formatTs = (ts) => {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' });
        } catch { return ts; }
    };

    return (
        <div className={styles.galleryRoot}>
            {PHASES.map(phase => {
                const phasePhotos = photosByPhase(phase.key);
                const uploadAllowed = isPhaseUploadAllowed(phase.key);
                const isUploading = uploading[phase.key];

                return (
                    <div key={phase.key} className={styles.phaseSection}>
                        {/* Header */}
                        <div className={styles.phaseHeader}>
                            <div className={styles.phaseHeaderLeft}>
                                <span className={styles.phaseIcon}>{phase.icon}</span>
                                <span className={styles.phaseName}>{phase.label}</span>
                                <span className={styles.phaseCount}>{phasePhotos.length}/{MAX_PHOTOS_PER_PHASE}</span>
                                {isPhaseFullyLocked(phase.key) && (
                                    <span className={styles.phaseLockBadge}>
                                        🔒 Đã khóa
                                    </span>
                                )}
                            </div>
                            {uploadAllowed && phasePhotos.length < MAX_PHOTOS_PER_PHASE && (
                                <button
                                    className={styles.uploadBtn}
                                    onClick={() => handleFileSelect(phase.key)}
                                    disabled={isUploading || !repairId}
                                    title={!repairId ? 'Lưu lệnh trước khi upload ảnh' : undefined}
                                >
                                    {isUploading ? (
                                        <>
                                            <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }}></i>
                                            Đang upload...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-camera"></i>
                                            Thêm ảnh
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Hidden file inputs */}
                            <input
                                ref={fileInputRefs[phase.key]}
                                type="file"
                                accept={ACCEPTED_TYPES}
                                className={styles.hiddenInput}
                                onChange={(e) => handleFileChange(phase.key, e)}
                            />
                        </div>

                        {/* Photo grid */}
                        {isUploading && phasePhotos.length === 0 ? (
                            <div className={styles.uploadingOverlay}>
                                <i className="bi bi-arrow-repeat"></i> Đang tải lên...
                            </div>
                        ) : phasePhotos.length === 0 ? (
                            <div className={styles.photoEmpty}>
                                <i className="bi bi-image"></i>
                                Chưa có ảnh. {phase.description}.
                            </div>
                        ) : (
                            <div className={styles.photoGrid}>
                                {phasePhotos.map(photo => (
                                    <div key={photo.id} className={styles.photoCard}>
                                        <img
                                            src={photo.secureUrl}
                                            alt={photo.caption || phase.label}
                                            className={styles.photoImg}
                                            loading="lazy"
                                        />
                                        {photo.locked && (
                                            <span className={styles.photoLockOverlay} title="Ảnh đã bị khóa">🔒</span>
                                        )}
                                        {photo.caption && (
                                            <div className={styles.photoCaption}>{photo.caption}</div>
                                        )}
                                        <div className={styles.photoActions}>
                                            {/* View */}
                                            <button
                                                className={styles.photoActionBtn}
                                                title="Xem ảnh"
                                                onClick={(e) => { e.stopPropagation(); openLightbox(photo); }}
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                            {/* Delete */}
                                            {uploadAllowed && (
                                                <button
                                                    className={`${styles.photoActionBtn} ${styles.photoActionBtnDanger}`}
                                                    title={photo.locked ? 'Đã khóa, không thể xóa' : 'Xóa ảnh'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(phase.key, photo.id, photo.locked);
                                                    }}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {/* Placeholder while uploading */}
                                {isUploading && (
                                    <div className={styles.photoCard} style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bi bi-arrow-repeat" style={{ fontSize: '24px', color: '#94a3b8', animation: 'spin 1s linear infinite' }}></i>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Lightbox */}
            {lightbox && (
                <div className={styles.lightbox} onClick={() => setLightbox(null)}>
                    <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                    <img
                        src={lightbox.url}
                        alt={lightbox.caption || 'Ảnh sửa chữa'}
                        className={styles.lightboxImg}
                        onClick={e => e.stopPropagation()}
                    />
                    <div className={styles.lightboxMeta}>
                        {lightbox.caption && <span>{lightbox.caption}</span>}
                        {lightbox.watermarkedAt && (
                            <span style={{ opacity: 0.7, fontSize: '12px' }}>
                                📅 {formatTs(lightbox.watermarkedAt)}
                                {lightbox.uploadedByName ? ` · ${lightbox.uploadedByName}` : ''}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Spin animation */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
