export const AUTH_EVENT = 'app:auth-changed';
export const USER_EVENT = 'app:user-updated';

export function getAuthToken() {
    return localStorage.getItem('token');
}

export function getAuthRole() {
    return localStorage.getItem('role');
}

export function getAuthUserId() {
    const rawUserId = localStorage.getItem('userId');
    return rawUserId ? Number(rawUserId) : null;
}

export function setAuthSession(session) {
    if (!session?.token) {
        return;
    }

    localStorage.setItem('token', session.token);

    if (session.role) {
        localStorage.setItem('role', session.role);
    } else {
        localStorage.removeItem('role');
    }

    if (session.id != null) {
        localStorage.setItem('userId', String(session.id));
    } else {
        localStorage.removeItem('userId');
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
        detail: { type: 'login', session }
    }));
}

export function clearAuthSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
}

export function forceLogout(message) {
    clearAuthSession();
    if (message) {
        sessionStorage.setItem('logoutMessage', message);
    } else {
        sessionStorage.removeItem('logoutMessage');
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
        detail: { type: 'logout', message }
    }));

    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

export function emitUserUpdated(detail) {
    window.dispatchEvent(new CustomEvent(USER_EVENT, { detail }));
}
