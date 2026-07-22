import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoiceCommand from '../../../hooks/useVoiceCommand';
import axiosClient from '../../../api/axiosClient';
import styles from './VoiceCommandButton.module.css';

/**
 * Floating Action Button for voice commands.
 * Speech → transcript → backend AI → intent + route → navigate.
 */
export default function VoiceCommandButton() {
    const navigate = useNavigate();
    const [showPanel, setShowPanel] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);      // VoiceCommandResponse
    const [apiError, setApiError] = useState('');

    const handleVoiceResult = useCallback(async (finalTranscript) => {
        if (!finalTranscript) return;

        setProcessing(true);
        setApiError('');
        setResult(null);

        try {
            const response = await axiosClient.post('/ai/voice-command', {
                message: finalTranscript,
            });
            const data = response?.data?.data;
            if (data) {
                setResult(data);
            } else {
                setApiError('Backend không trả về dữ liệu hợp lệ.');
            }
        } catch (err) {
            const msg = err.response?.data?.userMessage
                || err.response?.data?.message
                || 'Lỗi kết nối backend khi xử lý lệnh giọng nói.';
            setApiError(msg);
        } finally {
            setProcessing(false);
        }
    }, []);

    const {
        isListening,
        isSupported,
        transcript,
        error: voiceError,
        startListening,
        stopListening,
    } = useVoiceCommand({ onResult: handleVoiceResult });

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            setResult(null);
            setApiError('');
            setShowPanel(true);
            startListening();
        }
    };

    const handleConfirm = () => {
        if (result?.route) {
            const voiceData = result.data || {};
            navigate(result.route, { state: { voiceData } });
        }
        handleClose();
    };

    const handleClose = () => {
        stopListening();
        setShowPanel(false);
        setResult(null);
        setApiError('');
    };

    const handleRetry = () => {
        setResult(null);
        setApiError('');
        startListening();
    };

    // Determine panel status
    const getStatus = () => {
        if (isListening) return 'listening';
        if (processing) return 'processing';
        if (apiError || voiceError) return 'error';
        if (result) return 'done';
        return 'idle';
    };

    const status = getStatus();

    const statusLabels = {
        listening: 'Đang nghe',
        processing: 'Đang xử lý',
        error: 'Lỗi',
        done: 'Hoàn tất',
        idle: 'Sẵn sàng',
    };

    // Mic button class
    const micClasses = [
        styles.micButton,
        isListening ? styles.listening : '',
        processing ? styles.processing : '',
    ].filter(Boolean).join(' ');

    if (!isSupported) {
        return null; // Don't render at all on unsupported browsers
    }

    return (
        <div className={styles.voiceFab}>
            {/* Transcript Panel */}
            {showPanel && (
                <div className={styles.transcriptPanel}>
                    {/* Header */}
                    <div className={styles.panelHeader}>
                        <i className="fas fa-microphone-lines" aria-hidden="true" />
                        <span className={styles.panelTitle}>Lệnh giọng nói</span>
                        <span className={`${styles.statusPill} ${styles['status' + status.charAt(0).toUpperCase() + status.slice(1)]}`}>
                            {statusLabels[status]}
                        </span>
                    </div>

                    {/* Transcript */}
                    <div className={styles.transcriptArea}>
                        {transcript ? (
                            <>
                                {transcript}
                                {isListening && (
                                    <span className={styles.listeningDots}>
                                        <span />
                                        <span />
                                        <span />
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className={styles.placeholder}>
                                {isListening
                                    ? 'Đang lắng nghe… Hãy nói lệnh của bạn.'
                                    : processing
                                        ? 'Đang gửi đến AI xử lý…'
                                        : 'Nhấn nút micro để bắt đầu.'
                                }
                            </span>
                        )}
                    </div>

                    {/* Error */}
                    {(voiceError || apiError) && (
                        <div className={styles.errorMessage}>
                            <i className="fas fa-circle-exclamation" aria-hidden="true" />
                            {voiceError || apiError}
                        </div>
                    )}

                    {/* Intent Result */}
                    {result && result.intent !== 'UNKNOWN' && (
                        <div className={styles.intentResult}>
                            <div className={styles.intentLabel}>
                                <i className="fas fa-route" aria-hidden="true" /> Đã nhận diện
                            </div>
                            <div className={styles.intentMessage}>
                                {result.confirmMessage}
                            </div>
                        </div>
                    )}

                    {result && result.intent === 'UNKNOWN' && (
                        <div className={styles.errorMessage}>
                            <i className="fas fa-circle-question" aria-hidden="true" />
                            {result.confirmMessage || 'Không nhận diện được lệnh. Vui lòng thử lại.'}
                        </div>
                    )}

                    {/* Actions */}
                    <div className={styles.panelActions}>
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={handleClose}
                        >
                            <i className="fas fa-xmark" aria-hidden="true" />
                            Đóng
                        </button>

                        {(status === 'error' || (result && result.intent === 'UNKNOWN')) && (
                            <button
                                type="button"
                                className={styles.btnRetry}
                                onClick={handleRetry}
                            >
                                <i className="fas fa-rotate-right" aria-hidden="true" />
                                Thử lại
                            </button>
                        )}

                        {result && result.intent !== 'UNKNOWN' && result.route && (
                            <button
                                type="button"
                                className={styles.btnConfirm}
                                onClick={handleConfirm}
                            >
                                <i className="fas fa-check" aria-hidden="true" />
                                Xác nhận
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Mic FAB */}
            <button
                type="button"
                className={micClasses}
                onClick={handleMicClick}
                disabled={processing}
                title={isListening ? 'Dừng nghe' : 'Lệnh giọng nói'}
                aria-label={isListening ? 'Dừng nghe giọng nói' : 'Bắt đầu lệnh giọng nói'}
            >
                <i className={isListening ? 'fas fa-stop' : 'fas fa-microphone'} aria-hidden="true" />
            </button>
        </div>
    );
}
