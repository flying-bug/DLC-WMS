import { useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { readSessionState, sessionStateKey, writeSessionState } from '../utils/sessionState';

/**
 * Giống useState nhưng nhớ giá trị trong phiên làm việc theo từng trang. Chỉ KHÔI PHỤC khi người dùng quay lại bằng
 * Back/Forward hoặc F5 (điều hướng kiểu POP); bấm vào menu/liên kết mới (PUSH) thì về giá trị mặc định.
 * `options.disableRestore` tắt việc khôi phục (vd trang đang được mở kèm bộ lọc truyền từ trang khác).
 */
export default function useSessionState(key, initialValue, options = {}) {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();
    const storageKey = sessionStateKey(pathname, key);
    const shouldRestore = navigationType === 'POP' && !options.disableRestore;

    const [value, setValue] = useState(() => readSessionState(sessionStorage, storageKey, initialValue, shouldRestore));

    useEffect(() => {
        writeSessionState(sessionStorage, storageKey, value);
    }, [storageKey, value]);

    return [value, setValue];
}
