import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { buildThemeColors } from '../theme/palettes';
import { buildCommonStyles } from '../theme/buildStyles';
import { headerTop, radius, spacing } from '../theme/tokens';
import {
    type AppearanceSettings,
    type ColorMode,
    type AccentColor,
    type Density,
    DEFAULT_APPEARANCE,
    VALID_ACCENTS,
} from '../theme/types';

export type { ColorMode, AccentColor, Density, AppearanceSettings };

const STORAGE_KEY = 'smart-voyager-appearance';

async function loadSettings(): Promise<AppearanceSettings> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_APPEARANCE;
        const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
        const accent = VALID_ACCENTS.includes(parsed.accent as AccentColor)
            ? parsed.accent!
            : DEFAULT_APPEARANCE.accent;
        return {
            colorMode: parsed.colorMode ?? DEFAULT_APPEARANCE.colorMode,
            accent,
            density: parsed.density ?? DEFAULT_APPEARANCE.density,
        };
    } catch {
        return DEFAULT_APPEARANCE;
    }
}

interface ThemeContextValue {
    ready: boolean;
    settings: AppearanceSettings;
    resolvedDark: boolean;
    colors: ReturnType<typeof buildThemeColors>;
    common: ReturnType<typeof buildCommonStyles>;
    spacing: typeof spacing;
    radius: typeof radius;
    headerTop: number;
    setColorMode: (mode: ColorMode) => void;
    setAccent: (accent: AccentColor) => void;
    setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [ready, setReady] = useState(false);
    const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);

    useEffect(() => {
        loadSettings().then((s) => {
            setSettings(s);
            setReady(true);
        });
    }, []);

    const resolvedDark =
        settings.colorMode === 'dark' ||
        (settings.colorMode === 'system' && systemScheme === 'dark');

    const persist = useCallback(async (next: AppearanceSettings) => {
        setSettings(next);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }, []);

    const setColorMode = useCallback((colorMode: ColorMode) => {
        persist({ ...settings, colorMode });
    }, [settings, persist]);

    const setAccent = useCallback((accent: AccentColor) => {
        persist({ ...settings, accent });
    }, [settings, persist]);

    const setDensity = useCallback((density: Density) => {
        persist({ ...settings, density });
    }, [settings, persist]);

    const colors = useMemo(
        () => buildThemeColors(resolvedDark, settings.accent),
        [resolvedDark, settings.accent],
    );

    const common = useMemo(
        () => buildCommonStyles(colors, settings.density),
        [colors, settings.density],
    );

    const value = useMemo(
        () => ({
            ready,
            settings,
            resolvedDark,
            colors,
            common,
            spacing,
            radius,
            headerTop,
            setColorMode,
            setAccent,
            setDensity,
        }),
        [ready, settings, resolvedDark, colors, common, setColorMode, setAccent, setDensity],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
