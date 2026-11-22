import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useLayoutEffect,
} from 'react';

export type ColorMode = 'light' | 'dark' | 'system';
export type AccentColor = 'slate' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';
export type Density = 'comfortable' | 'compact';

export interface AppearanceSettings {
    colorMode: ColorMode;
    accent: AccentColor;
    density: Density;
}

const STORAGE_KEY = 'smart-voyager-appearance';

const VALID_ACCENTS: AccentColor[] = ['slate', 'blue', 'violet', 'emerald', 'rose', 'amber'];

const DEFAULT_SETTINGS: AppearanceSettings = {
    colorMode: 'system',
    accent: 'slate',
    density: 'comfortable',
};

function loadSettings(): AppearanceSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw) as Partial<AppearanceSettings> & { reducedMotion?: boolean };
        const accent = VALID_ACCENTS.includes(parsed.accent as AccentColor)
            ? parsed.accent!
            : DEFAULT_SETTINGS.accent;
        return {
            colorMode: parsed.colorMode ?? DEFAULT_SETTINGS.colorMode,
            accent,
            density: parsed.density ?? DEFAULT_SETTINGS.density,
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function resolveDark(colorMode: ColorMode): boolean {
    if (colorMode === 'dark') return true;
    if (colorMode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyToDocument(settings: AppearanceSettings) {
    const root = document.documentElement;
    const isDark = resolveDark(settings.colorMode);

    root.classList.toggle('dark', isDark);
    root.dataset.accent = settings.accent;
    root.dataset.density = settings.density;
}

interface ThemeContextValue {
    settings: AppearanceSettings;
    resolvedDark: boolean;
    setColorMode: (mode: ColorMode) => void;
    setAccent: (accent: AccentColor) => void;
    setDensity: (density: Density) => void;
    updateSettings: (patch: Partial<AppearanceSettings>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppearanceSettings>(() => loadSettings());
    const [resolvedDark, setResolvedDark] = useState(() => resolveDark(loadSettings().colorMode));

    const persist = useCallback((next: AppearanceSettings) => {
        setSettings(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        applyToDocument(next);
        setResolvedDark(resolveDark(next.colorMode));
    }, []);

    useLayoutEffect(() => {
        applyToDocument(settings);
        setResolvedDark(resolveDark(settings.colorMode));
    }, [settings]);

    useEffect(() => {
        if (settings.colorMode !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            applyToDocument(settings);
            setResolvedDark(mq.matches);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [settings]);

    const updateSettings = useCallback((patch: Partial<AppearanceSettings>) => {
        persist({ ...settings, ...patch });
    }, [settings, persist]);

    const setColorMode = useCallback((colorMode: ColorMode) => {
        document.documentElement.classList.add('theme-transition');
        updateSettings({ colorMode });
        setTimeout(() => document.documentElement.classList.remove('theme-transition'), 300);
    }, [updateSettings]);

    const setAccent = useCallback((accent: AccentColor) => updateSettings({ accent }), [updateSettings]);
    const setDensity = useCallback((density: Density) => updateSettings({ density }), [updateSettings]);

    return (
        <ThemeContext.Provider
            value={{
                settings,
                resolvedDark,
                setColorMode,
                setAccent,
                setDensity,
                updateSettings,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

export function initThemeFromStorage() {
    applyToDocument(loadSettings());
}
