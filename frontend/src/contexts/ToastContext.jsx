import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Toast from '../components/ui/Toast/Toast';
import styles from '../components/ui/Toast/Toast.module.css';

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((type, message, title = '') => {
        setToasts((currentToasts) => {
            // Prevent duplicate toasts
            const isDuplicate = currentToasts.some(
                (t) => t.message === message && t.type === type && t.title === title
            );
            if (isDuplicate) return currentToasts;

            const id = Date.now().toString();
            const newToast = { id, type, message, title };

            // Auto close after 3 seconds
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3000);

            return [...currentToasts, newToast];
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    useEffect(() => {
        const handlePermissionDenied = (event) => {
            showToast('danger', event.detail?.message || 'Bạn không có quyền thực hiện thao tác này.', 'Truy cập bị từ chối');
        };

        window.addEventListener('app:permission-denied', handlePermissionDenied);
        return () => {
            window.removeEventListener('app:permission-denied', handlePermissionDenied);
        };
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        type={toast.type}
                        message={toast.message}
                        title={toast.title}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
