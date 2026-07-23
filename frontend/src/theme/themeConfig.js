export const THEME_STORAGE_KEY = 'app-theme';

export const THEMES = [
    { id: 'default', name: 'Mặc định', color: '#0075c0' },
    { id: 'emerald', name: 'Xanh lá', color: '#059669' },
    { id: 'violet', name: 'Tím', color: '#7c3aed' },
    { id: 'pink', name: 'Hồng', color: '#ec4899' },
    { id: 'dark', name: 'Tối', color: '#111827' }
];

export function isValidTheme(theme) {
    return THEMES.some((item) => item.id === theme);
}
