import type { AccentColor } from './types';

export interface ThemeColors {
    page: string;
    surface: string;
    elevated: string;
    border: string;
    borderLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentMuted: string;
    onAccent: string;
    rose: string;
    roseBg: string;
    roseBorder: string;
    emerald: string;
    emeraldBg: string;
    error: string;
    errorBg: string;
    routeLine: string;
    statusBar: 'light' | 'dark';
}

const BASE_LIGHT = {
    page: '#f8fafc',
    surface: '#ffffff',
    elevated: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    rose: '#e11d48',
    roseBg: '#fff1f2',
    roseBorder: '#fecdd3',
    emerald: '#059669',
    emeraldBg: '#ecfdf5',
    error: '#ef4444',
    errorBg: '#fef2f2',
    routeLine: '#475569',
    statusBar: 'dark' as const,
};

const BASE_DARK = {
    page: '#020617',
    surface: '#0f172a',
    elevated: '#1e293b',
    border: '#334155',
    borderLight: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    rose: '#fb7185',
    roseBg: '#881337',
    roseBorder: '#9f1239',
    emerald: '#34d399',
    emeraldBg: '#064e3b',
    error: '#f87171',
    errorBg: '#7f1d1d',
    routeLine: '#94a3b8',
    statusBar: 'light' as const,
};

const ACCENTS: Record<AccentColor, { light: { accent: string; accentMuted: string }; dark: { accent: string; accentMuted: string } }> = {
    slate: {
        light: { accent: '#0f172a', accentMuted: '#f1f5f9' },
        dark: { accent: '#e2e8f0', accentMuted: '#334155' },
    },
    blue: {
        light: { accent: '#2563eb', accentMuted: '#eff6ff' },
        dark: { accent: '#3b82f6', accentMuted: '#1e3a5f' },
    },
    violet: {
        light: { accent: '#7c3aed', accentMuted: '#f5f3ff' },
        dark: { accent: '#8b5cf6', accentMuted: '#2e1065' },
    },
    emerald: {
        light: { accent: '#059669', accentMuted: '#ecfdf5' },
        dark: { accent: '#34d399', accentMuted: '#064e3b' },
    },
    rose: {
        light: { accent: '#e11d48', accentMuted: '#fff1f2' },
        dark: { accent: '#fb7185', accentMuted: '#881337' },
    },
    amber: {
        light: { accent: '#d97706', accentMuted: '#fffbeb' },
        dark: { accent: '#fbbf24', accentMuted: '#78350f' },
    },
};

function onAccentColor(accent: AccentColor, isDark: boolean): string {
    if (!isDark) return '#ffffff';
    if (accent === 'slate' || accent === 'amber' || accent === 'emerald') return '#0f172a';
    return '#ffffff';
}

export function buildThemeColors(isDark: boolean, accent: AccentColor): ThemeColors {
    const base = isDark ? BASE_DARK : BASE_LIGHT;
    const accentSet = ACCENTS[accent][isDark ? 'dark' : 'light'];
    return {
        ...base,
        accent: accentSet.accent,
        accentMuted: accentSet.accentMuted,
        onAccent: onAccentColor(accent, isDark),
    };
}
