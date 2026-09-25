import { useEffect, useEffectEvent, useRef, useState } from 'react';
import axiosClient, { getBaseURL } from '../../api/axiosClient';
import { AUTH_EVENT, emitDataChanged, emitNotificationReceived, emitSystemHealthReceived, emitUserUpdated, forceLogout, getAuthToken } from '../../auth/session';

const RECONNECT_DELAY_MS = 5000;

function RealtimeSessionBridge() {
    const eventSourceRef = useRef(null);
    const hasOpenedRef = useRef(false);
    const hiddenAtRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const [reconnectRequest, setReconnectRequest] = useState(0);

    const closeConnection = useEffectEvent(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    });

    // EventSource tự kết nối lại khi mất mạng, nhưng bỏ hẳn nếu server trả lỗi HTTP (401 khi phiên đã bị thay,
    // 502 khi backend đang khởi động lại...). Gọi thử một API: 401 thì axiosClient đăng xuất kèm đúng lý do
    // (vd. "Bạn đã đăng nhập ở một nơi khác."), còn lại thì mở lại kết nối realtime.
    const scheduleReconnect = useEffectEvent((token) => {
        if (reconnectTimerRef.current) {
            return;
        }
        reconnectTimerRef.current = setTimeout(async () => {
            reconnectTimerRef.current = null;
            if (getAuthToken() !== token) {
                return;
            }
            try {
                await axiosClient.get('/users/me');
            } catch (error) {
                if (error.response?.status === 401) {
                    return;
                }
            }
            if (getAuthToken() === token) {
                setReconnectRequest((count) => count + 1);
            }
        }, RECONNECT_DELAY_MS);
    });

    const openConnection = useEffectEvent(() => {
        const token = getAuthToken();
        if (!token) {
            closeConnection();
            return;
        }

        closeConnection();

        const streamUrl = `${getBaseURL()}/realtime/stream?access_token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('user-updated', (event) => {
            try {
                emitUserUpdated(JSON.parse(event.data));
            } catch (error) {
                console.error('Khong the doc realtime user event:', error);
            }
        });

        eventSource.addEventListener('notification', (event) => {
            try {
                emitNotificationReceived(JSON.parse(event.data));
            } catch (error) {
                console.error('Khong the doc realtime notification event:', error);
            }
        });

        eventSource.addEventListener('data-changed', (event) => {
            try {
                emitDataChanged(JSON.parse(event.data));
            } catch (error) {
                console.error('Khong the doc realtime data-changed event:', error);
            }
        });

        // SSE khong phat lai su kien bi lo trong luc mat ket noi -> ket noi lai thi tai lai moi thu.
        eventSource.onopen = () => {
            if (hasOpenedRef.current) {
                emitDataChanged({ topic: 'ALL', ids: null });
            }
            hasOpenedRef.current = true;
        };

        eventSource.addEventListener('system-health', (event) => {
            try {
                emitSystemHealthReceived(JSON.parse(event.data));
            } catch (error) {
                console.error('Khong the doc realtime system-health event:', error);
            }
        });

        eventSource.addEventListener('force-logout', (event) => {
            // Sự kiện đến muộn trên kết nối của token cũ (tab này đã đăng nhập lại) thì bỏ qua.
            if (getAuthToken() !== token) {
                return;
            }
            try {
                const payload = JSON.parse(event.data);
                forceLogout(payload?.message || 'Phien dang nhap cua ban da het hieu luc.');
            } catch (error) {
                console.error('Khong the doc realtime logout event:', error);
                forceLogout('Phien dang nhap cua ban da het hieu luc.');
            }
        });

        eventSource.onerror = () => {
            if (!getAuthToken()) {
                closeConnection();
                return;
            }
            if (eventSource.readyState === EventSource.CLOSED && eventSourceRef.current === eventSource) {
                scheduleReconnect(token);
            }
        };

        eventSourceRef.current = eventSource;
    });

    useEffect(() => {
        openConnection();

        const handleAuthChanged = () => {
            openConnection();
        };

        // Du phong khi proxy lam dut/tre SSE: tab hien lai sau khi an lau thi tai lai du lieu.
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAtRef.current = Date.now();
                return;
            }
            const hiddenAt = hiddenAtRef.current;
            hiddenAtRef.current = null;
            if (hiddenAt && Date.now() - hiddenAt >= 30000 && getAuthToken()) {
                emitDataChanged({ topic: 'ALL', ids: null });
            }
        };

        window.addEventListener(AUTH_EVENT, handleAuthChanged);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            window.removeEventListener(AUTH_EVENT, handleAuthChanged);
            document.removeEventListener('visibilitychange', handleVisibility);
            closeConnection();
        };
    }, []);

    useEffect(() => {
        if (reconnectRequest > 0) {
            openConnection();
        }
    }, [reconnectRequest]);

    return null;
}

export default RealtimeSessionBridge;
