import { StyleSheet } from 'react-native';
import type { Density } from './types';
import type { ThemeColors } from './palettes';
import { radius, shadows, spacing as baseSpacing } from './tokens';

export function buildCommonStyles(colors: ThemeColors, density: Density) {
    const pad = density === 'compact' ? baseSpacing.sm : baseSpacing.md;
    const scrollPad = density === 'compact' ? baseSpacing.md : baseSpacing.lg;

    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.page,
        },
        scroll: {
            padding: scrollPad,
            paddingBottom: 40,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: pad,
            marginBottom: pad,
            ...shadows.card,
        },
        label: {
            fontSize: 13,
            fontWeight: '500',
            color: colors.textSecondary,
            marginBottom: 6,
        },
        input: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
        },
        primaryBtn: {
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            paddingVertical: 14,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        primaryBtnText: {
            color: colors.onAccent,
            fontSize: 15,
            fontWeight: '600',
        },
        secondaryBtn: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        secondaryBtnText: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '500',
        },
        iconBtn: {
            padding: 10,
            backgroundColor: colors.elevated,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
        },
        pageTitle: {
            fontSize: density === 'compact' ? 24 : 26,
            fontWeight: '600',
            color: colors.text,
            letterSpacing: -0.5,
        },
        pageSubtitle: {
            fontSize: 14,
            color: colors.textMuted,
            marginTop: 4,
        },
        sectionTitle: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
        },
        centered: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.page,
        },
    });
}
