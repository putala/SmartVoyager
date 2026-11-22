import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Compass } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface BrandMarkProps {
    size?: 'sm' | 'md';
    showName?: boolean;
}

export function BrandMark({ size = 'md', showName = false }: BrandMarkProps) {
    const { colors, radius } = useTheme();
    const box = size === 'sm' ? 40 : 48;
    const icon = size === 'sm' ? 20 : 24;

    return (
        <View style={styles.row}>
            <View style={[styles.iconBox, {
                width: box,
                height: box,
                borderRadius: radius.md,
                backgroundColor: colors.accent,
            }]}>
                <Compass size={icon} color={colors.onAccent} strokeWidth={2} />
            </View>
            {showName && <Text style={[styles.name, { color: colors.text }]}>Smart Voyager</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
});
