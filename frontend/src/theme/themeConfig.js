export const THEME_STORAGE_KEY = 'app-theme';

export const THEMES = [
    { id: 'default', name: 'Mac dinh', color: '#0075c0' },
    { id: 'emerald', name: 'Xanh la', color: '#059669' },
    { id: 'violet', name: 'Tim', color: '#7c3aed' },
    { id: 'dark', name: 'Toi', color: '#111827' }
];

export function isValidTheme(theme) {
    return THEMES.some((item) => item.id === theme);
}
