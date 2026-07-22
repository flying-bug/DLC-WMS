export const AUTH_EVENT = 'app:auth-changed';
export const USER_EVENT = 'app:user-updated';

export function getAuthToken() {
    return sessionStorage.getItem('token');
}

export function getAuthRole() {
    return sessionStorage.getItem('role');
}

export function getAuthUserId() {
    const rawUserId = sessionStorage.getItem('userId');
    return rawUserId ? Number(rawUserId) : null;
}

export function setAuthSession(session) {
    if (!session?.token) {
        return;
    }

    sessionStorage.setItem('token', session.token);

    if (session.role) {
        sessionStorage.setItem('role', session.role);
    } else {
        sessionStorage.removeItem('role');
    }

    if (session.id != null) {
        sessionStorage.setItem('userId', String(session.id));
    } else {
        sessionStorage.removeItem('userId');
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
        detail: { type: 'login', session }
    }));
}

export function clearAuthSession() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('userId');
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
