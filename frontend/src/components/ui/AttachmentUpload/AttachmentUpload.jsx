import React, { useState, useRef } from 'react';
import { uploadDocument } from '@/api/uploadApi';
import styles from './AttachmentUpload.module.css';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const AttachmentUpload = ({
  files = [],
  onChange,
  folder = 'attachments',
  maxSizeMB = 5,
  maxFiles = 10,
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = async (selectedFiles) => {
    if (disabled || !selectedFiles || selectedFiles.length === 0) return;
    setErrorMessage('');

    if (files.length + selectedFiles.length > maxFiles) {
      setErrorMessage(`Bạn chỉ có thể đính kèm tối đa ${maxFiles} tệp.`);
      return;
    }

    const validFiles = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      if (f.size > maxSizeBytes) {
        setErrorMessage(`Tệp "${f.name}" vượt quá dung lượng tối đa ${maxSizeMB}MB.`);
        return;
      }
      validFiles.push(f);
    }

    setUploading(true);
    try {
      const uploadedResults = [];
      for (const file of validFiles) {
        const res = await uploadDocument(file, folder);
        const data = res?.data || res;
        uploadedResults.push({
          name: file.name,
          size: file.size,
          type: file.type,
          url: data.secureUrl || data.url,
          publicId: data.publicId,
        });
      }

      if (onChange) {
        onChange([...files, ...uploadedResults]);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.userMessage || err.message || 'Không thể tải lên tệp đính kèm.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleDelete = (indexToDelete) => {
    if (disabled) return;
    const updated = files.filter((_, idx) => idx !== indexToDelete);
    if (onChange) {
      onChange(updated);
    }
  };

  const isImage = (file) => {
    const type = file.type || '';
    const url = file.url || '';
    return type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name || '');
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <span className={styles.title}>
          <i className="bi bi-paperclip"></i>
          Đính kèm
        </span>
        <span className={styles.maxSizeHint}>Dung lượng tối đa {maxSizeMB}MB</span>
      </div>

      {/* Dropzone */}
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <i className={`bi bi-cloud-arrow-up ${styles.uploadIcon}`}></i>
        <span className={styles.dropzoneText}>
          <strong>Chọn tệp</strong> hoặc kéo và thả tệp vào đây
        </span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className={styles.fileInput}
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>

      {uploading && (
        <div className={styles.uploadingBox}>
          <div className={styles.spinner}></div>
          <span>Đang tải tệp lên hệ thống...</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
          <i className="bi bi-exclamation-circle" style={{ marginRight: '4px' }}></i>
          {errorMessage}
        </div>
      )}

      {/* File List */}
      {files && files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file, idx) => {
            const isImg = isImage(file);
            return (
              <div className={styles.fileCard} key={file.publicId || file.url || idx}>
                {isImg ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className={styles.fileThumb}
                    onClick={() => setPreviewFile(file)}
                    title="Bấm để xem ảnh phóng to"
                  />
                ) : (
                  <div className={styles.docIcon} title="Tài liệu PDF">
                    <i className="bi bi-file-earmark-pdf"></i>
                  </div>
                )}

                <div className={styles.fileInfo}>
                  <span className={styles.fileName} title={file.name}>
                    {file.name || 'Tệp đính kèm'}
                  </span>
                  <span className={styles.fileMeta}>{formatFileSize(file.size)}</span>
                </div>

                <div className={styles.fileActions}>
                  {isImg && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => setPreviewFile(file)}
                      title="Xem ảnh phóng to"
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                  )}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    download={file.name}
                    className={styles.actionBtn}
                    title="Tải xuống tệp"
                  >
                    <i className="bi bi-download"></i>
                  </a>
                  {!disabled && (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDelete(idx)}
                      title="Xóa tệp"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewFile && (
        <div className={styles.lightboxOverlay} onClick={() => setPreviewFile(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={() => setPreviewFile(null)}
              title="Đóng"
            >
              <i className="bi bi-x"></i>
            </button>
            <img src={previewFile.url} alt={previewFile.name} className={styles.lightboxImg} />
            <div className={styles.lightboxTitle}>{previewFile.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUpload;
