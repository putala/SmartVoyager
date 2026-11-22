import { Platform } from 'react-native';

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
};

export const spacing = {
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
};

export const headerTop = Platform.OS === 'android' ? 44 : 8;

export const shadows = {
    card: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
};

// Static light defaults for legacy imports (prefer useTheme())
export const colors = {
    page: '#f8fafc',
    surface: '#ffffff',
    elevated: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    accent: '#0f172a',
    accentMuted: '#f1f5f9',
    rose: '#e11d48',
    roseBg: '#fff1f2',
    roseBorder: '#fecdd3',
    emerald: '#059669',
    emeraldBg: '#ecfdf5',
    error: '#ef4444',
    errorBg: '#fef2f2',
};
