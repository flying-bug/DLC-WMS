export const AUTH_EVENT = 'app:auth-changed';
export const USER_EVENT = 'app:user-updated';

export function getAuthToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export function getAuthRole() {
    return sessionStorage.getItem('role') || localStorage.getItem('role');
}

export function getAuthRoles() {
    try {
        const raw = sessionStorage.getItem('roles') || localStorage.getItem('roles');
        if (raw) return JSON.parse(raw);
    } catch {
        // Fallback
    }
    const singleRole = getAuthRole();
    return singleRole ? [singleRole] : [];
}

export function getAuthPermissions() {
    try {
        const raw = sessionStorage.getItem('permissions') || localStorage.getItem('permissions');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function hasPermission(requiredPerm) {
    const roles = getAuthRoles();
    if (roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN')) return true;
    const perms = getAuthPermissions();
    if (Array.isArray(requiredPerm)) {
        return requiredPerm.some(p => perms.includes(p));
    }
    return perms.includes(requiredPerm);
}

export function hasAnyModulePermission(moduleName) {
    const roles = getAuthRoles();
    if (roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN')) return true;
    const perms = getAuthPermissions();
    return perms.some(p => p === moduleName || p.startsWith(`${moduleName}:`));
}

export function canViewPricing() {
    const roles = getAuthRoles().map(r => String(r || '').toUpperCase());
    if (roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN' || r === 'ADMIN' || r === 'ROLE_ADMIN' || r === 'MANAGER' || r === 'ROLE_MANAGER' || r === 'ACCOUNTANT' || r === 'ROLE_ACCOUNTANT' || r === 'CASHIER_CONTROLLER' || r === 'ROLE_CASHIER_CONTROLLER')) {
        return true;
    }
    return false;
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

    if (session.roles && Array.isArray(session.roles)) {
        sessionStorage.setItem('roles', JSON.stringify(session.roles));
    } else if (session.role) {
        sessionStorage.setItem('roles', JSON.stringify([session.role]));
    } else {
        sessionStorage.removeItem('roles');
    }

    if (session.permissions && Array.isArray(session.permissions)) {
        sessionStorage.setItem('permissions', JSON.stringify(session.permissions));
    } else {
        sessionStorage.removeItem('permissions');
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
        if (session.roles) localStorage.setItem('roles', JSON.stringify(session.roles));
        if (session.permissions) localStorage.setItem('permissions', JSON.stringify(session.permissions));
        if (session.id != null) localStorage.setItem('userId', String(session.id));
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('roles');
        localStorage.removeItem('permissions');
        localStorage.removeItem('userId');
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
        detail: { type: 'login', session }
    }));
}

export function clearAuthSession() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('roles');
    sessionStorage.removeItem('permissions');
    sessionStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    localStorage.removeItem('userId');
}

// Auto-restore session from localStorage if user re-opens the browser
if (!sessionStorage.getItem('token') && localStorage.getItem('token')) {
    sessionStorage.setItem('token', localStorage.getItem('token'));
    const savedRole = localStorage.getItem('role');
    if (savedRole) sessionStorage.setItem('role', savedRole);
    const savedRoles = localStorage.getItem('roles');
    if (savedRoles) sessionStorage.setItem('roles', savedRoles);
    const savedPerms = localStorage.getItem('permissions');
    if (savedPerms) sessionStorage.setItem('permissions', savedPerms);
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
