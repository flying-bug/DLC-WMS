export const AUTH_EVENT = 'app:auth-changed';
export const USER_EVENT = 'app:user-updated';

export function getAuthToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export function getAuthRole() {
    return sessionStorage.getItem('role') || localStorage.getItem('role');
}

export function getAuthUserId() {
    const rawUserId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    return rawUserId ? Number(rawUserId) : null;
}

export function setAuthSession(session, rememberMe = false) {
    if (!session?.token) {
        return;
    }

    // Always write to sessionStorage so that the rest of the app works
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

    // If rememberMe is true, also backup to localStorage
    if (rememberMe) {
        localStorage.setItem('token', session.token);
        if (session.role) localStorage.setItem('role', session.role);
        if (session.id != null) localStorage.setItem('userId', String(session.id));
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
        detail: { type: 'login', session }
    }));
}

export function clearAuthSession() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
}

// Auto-restore session from localStorage if user re-opens the browser
if (!sessionStorage.getItem('token') && localStorage.getItem('token')) {
    sessionStorage.setItem('token', localStorage.getItem('token'));
    const savedRole = localStorage.getItem('role');
    if (savedRole) sessionStorage.setItem('role', savedRole);
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) sessionStorage.setItem('userId', savedUserId);
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
