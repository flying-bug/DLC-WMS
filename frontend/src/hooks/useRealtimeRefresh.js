import { useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT } from '../auth/session';

const normalize = (topics) => {
    if (Array.isArray(topics)) {
        return Object.fromEntries(topics.map((topic) => [topic, null]));
    }
    return topics || {};
};

/**
 * Tự tải lại (im lặng) khi backend báo dữ liệu đã đổi.
 *
 * topics: ['PURCHASE_ORDER'] hoặc { PURCHASE_ORDER: id, IMPORT_DOCUMENT: null } - giá trị là id của bản ghi
 *         đang xem (chỉ khớp sự kiện chứa id đó); null = mọi bản ghi của topic. Sự kiện không rõ id
 *         (ids null) hoặc topic 'ALL' luôn khớp.
 * reload: hàm tải dữ liệu, được gọi là reload({ silent: true }) - không bật spinner, không reset chọn/trang.
 * options.enabled: false để tạm tắt (vd. trang đang ở chế độ chỉnh sửa).
 */
export function useRealtimeRefresh(topics, reload, { debounceMs = 800, enabled = true } = {}) {
    const reloadRef = useRef(reload);
    const topicsRef = useRef(normalize(topics));
    const enabledRef = useRef(enabled);

    useEffect(() => {
        reloadRef.current = reload;
        topicsRef.current = normalize(topics);
        enabledRef.current = enabled;
    });

    useEffect(() => {
        let timer = null;

        const handleChange = (event) => {
            if (!enabledRef.current) return;
            const { topic, ids } = event.detail || {};
            const watched = topicsRef.current;

            let matches = topic === 'ALL';
            if (!matches && Object.prototype.hasOwnProperty.call(watched, topic)) {
                const wantedId = watched[topic];
                matches = wantedId == null || ids == null || ids.map(String).includes(String(wantedId));
            }
            if (!matches) return;

            clearTimeout(timer);
            timer = setTimeout(() => {
                if (enabledRef.current) {
                    reloadRef.current?.({ silent: true });
                }
            }, debounceMs);
        };

        window.addEventListener(DATA_CHANGED_EVENT, handleChange);
        return () => {
            window.removeEventListener(DATA_CHANGED_EVENT, handleChange);
            clearTimeout(timer);
        };
    }, [debounceMs]);
}
