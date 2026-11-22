import React from 'react';
import { Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { formatOpeningHours, isOpenAt } from '../../utils/openingHours';

export function OpeningHours({ value }: { value: string }) {
    const { colors } = useTheme();
    const open = isOpenAt(value, new Date());

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
            <Clock size={11} color={colors.textMuted} style={{ marginTop: 3 }} />
            <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>
                {open !== null && (
                    <Text style={{ fontWeight: '600', color: open ? colors.emerald : colors.error }}>
                        {open ? 'Otwarte teraz' : 'Zamknięte'}{'  '}
                    </Text>
                )}
                {formatOpeningHours(value)}
            </Text>
        </View>
    );
}
