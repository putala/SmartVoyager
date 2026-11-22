import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const COLLAPSED_LINES = 3;
// About three lines of 13 px text on a phone; shorter descriptions need no toggle
const TOGGLE_MIN_LENGTH = 140;

interface Props {
    text: string;
    expanded: boolean;
    onToggle: () => void;
}

export function ExpandableDescription({ text, expanded, onToggle }: Props) {
    const { colors } = useTheme();
    const Icon = expanded ? ChevronUp : ChevronDown;

    return (
        <>
            <Text
                style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 }}
                numberOfLines={expanded ? undefined : COLLAPSED_LINES}
            >
                {text}
            </Text>
            {text.length > TOGGLE_MIN_LENGTH && (
                <TouchableOpacity
                    onPress={onToggle}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4, alignSelf: 'flex-start' }}
                >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                        {expanded ? 'Pokaż mniej' : 'Pokaż więcej'}
                    </Text>
                    <Icon size={12} color={colors.text} />
                </TouchableOpacity>
            )}
        </>
    );
}
