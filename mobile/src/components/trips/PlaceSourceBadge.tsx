import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export function PlaceSourceBadge({ verified }: { verified?: boolean }) {
    const { colors } = useTheme();
    const foreground = verified ? colors.emerald : colors.textSecondary;
    const Icon = verified ? BadgeCheck : Sparkles;

    return (
        <View style={[styles.badge, { backgroundColor: verified ? colors.emeraldBg : colors.elevated }]}>
            <Icon size={11} color={foreground} />
            <Text style={[styles.label, { color: foreground }]}>
                {verified ? 'Potwierdzone w mapach' : 'Propozycja AI'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginTop: 4,
    },
    label: { fontSize: 10, fontWeight: '600' },
});
