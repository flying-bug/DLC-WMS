import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasPreviousAppPage, resolveBackTarget } from '../utils/backTarget';

/**
 * Hàm quay lại dùng chung: về đúng trang người dùng vừa đến từ đó (A → B → C → D thì Back ở D về C),
 * chỉ dùng đường dẫn cố định `fallbackPath` khi không còn trang trước trong ứng dụng.
 */
export default function useGoBack(fallbackPath) {
    const navigate = useNavigate();
    const location = useLocation();
    const returnUrl = location.state?.returnUrl || null;

    return useCallback(() => {
        const target = resolveBackTarget({
            hasPrevious: hasPreviousAppPage(window.history.state),
            returnUrl,
            fallback: fallbackPath,
        });
        if (target.type === 'back') {
            navigate(-1);
        } else {
            navigate(target.to, { replace: true });
        }
    }, [navigate, returnUrl, fallbackPath]);
}
