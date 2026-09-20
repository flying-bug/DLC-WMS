import { useEffect, useEffectEvent, useRef } from 'react';
import { getBaseURL } from '../../api/axiosClient';
import { AUTH_EVENT, emitDataChanged, emitNotificationReceived, emitSystemHealthReceived, emitUserUpdated, forceLogout, getAuthToken } from '../../auth/session';

function RealtimeSessionBridge() {
    const eventSourceRef = useRef(null);
    const hasOpenedRef = useRef(false);
    const hiddenAtRef = useRef(null);

    const closeConnection = useEffectEvent(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
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

    return null;
}

export default RealtimeSessionBridge;
