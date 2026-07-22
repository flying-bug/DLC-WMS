import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook for Web Speech API voice recognition (Vietnamese).
 * Uses SpeechRecognition API available in Chrome/Edge.
 *
 * @param {Object} options
 * @param {function} options.onResult - Callback with final transcript string
 * @param {function} [options.onError] - Callback for errors
 * @returns {{ isListening, isSupported, transcript, startListening, stopListening, error }}
 */
export default function useVoiceCommand({ onResult, onError } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);
    const onResultRef = useRef(onResult);
    const onErrorRef = useRef(onError);

    // Keep callback refs fresh
    useEffect(() => { onResultRef.current = onResult; }, [onResult]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const SpeechRecognition = typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    const isSupported = Boolean(SpeechRecognition);

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            const msg = 'Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.';
            setError(msg);
            onErrorRef.current?.(msg);
            return;
        }

        // Stop any existing session
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('');
            setError('');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            // Show interim results for real-time feedback
            setTranscript(finalTranscript || interimTranscript);

            if (finalTranscript) {
                onResultRef.current?.(finalTranscript.trim());
            }
        };

        recognition.onerror = (event) => {
            let msg;
            switch (event.error) {
                case 'not-allowed':
                    msg = 'Quyền sử dụng microphone bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.';
                    break;
                case 'no-speech':
                    msg = 'Không phát hiện giọng nói. Vui lòng thử lại.';
                    break;
                case 'audio-capture':
                    msg = 'Không tìm thấy microphone. Vui lòng kiểm tra thiết bị.';
                    break;
                case 'network':
                    msg = 'Lỗi mạng khi nhận diện giọng nói. Vui lòng kiểm tra kết nối internet.';
                    break;
                case 'aborted':
                    // User or code stopped it — not a real error
                    msg = '';
                    break;
                default:
                    msg = `Lỗi nhận diện giọng nói: ${event.error}`;
            }

            if (msg) {
                setError(msg);
                onErrorRef.current?.(msg);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (err) {
            setError('Không thể khởi động nhận diện giọng nói.');
            setIsListening(false);
        }
    }, [SpeechRecognition]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
        }
        setIsListening(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
            }
        };
    }, []);

    return {
        isListening,
        isSupported,
        transcript,
        error,
        startListening,
        stopListening,
    };
}
