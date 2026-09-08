export const THEME_STORAGE_KEY = 'app-theme';

export const THEMES = [
    { id: 'default', name: 'Mặc định', color: '#0075c0' },
    { id: 'emerald', name: 'Xanh lá', color: 'var(--wms-success)' },
    { id: 'violet', name: 'Tím', color: '#ab82f2ff' },
    { id: 'pink', name: 'Hồng', color: '#fc54a8ff' },
    { id: 'dark', name: 'Tối', color: '#0f1117' }
];

export function isValidTheme(theme) {
    return THEMES.some((item) => item.id === theme);
}
