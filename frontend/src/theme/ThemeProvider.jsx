import { useEffect, useMemo, useState } from 'react';
import { THEMES, THEME_STORAGE_KEY, isValidTheme } from './themeConfig';
import { ThemeContext } from './themeContext';

function getInitialTheme() {
    if (typeof window === 'undefined') {
        return 'default';
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) ? storedTheme : 'default';
}

function applyTheme(theme) {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        themes: THEMES,
        setTheme: (nextTheme) => {
            if (isValidTheme(nextTheme)) {
                setThemeState(nextTheme);
            }
        }
    }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
