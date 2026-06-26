import { useEffect, useEffectEvent, useRef } from 'react';
import { getBaseURL } from '../../api/axiosClient';
import { AUTH_EVENT, emitUserUpdated, forceLogout, getAuthToken } from '../../auth/session';

function RealtimeSessionBridge() {
    const eventSourceRef = useRef(null);

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

        window.addEventListener(AUTH_EVENT, handleAuthChanged);
        return () => {
            window.removeEventListener(AUTH_EVENT, handleAuthChanged);
            closeConnection();
        };
    }, []);

    return null;
}

export default RealtimeSessionBridge;
