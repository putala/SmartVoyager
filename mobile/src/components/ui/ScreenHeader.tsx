import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    right?: React.ReactNode;
    centerTitle?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, right, centerTitle }: ScreenHeaderProps) {
    const { colors, headerTop, spacing, radius } = useTheme();

    const actionBtnSize = 40;

    return (
        <View style={[styles.wrapper, {
            paddingTop: headerTop,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            backgroundColor: colors.page,
            borderBottomColor: colors.borderLight,
        }]}>
            {centerTitle ? (
                <View style={[styles.row, { gap: spacing.sm, alignItems: 'center' }]}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            style={[styles.actionBtn, {
                                width: actionBtnSize,
                                height: actionBtnSize,
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                borderRadius: radius.md,
                            }]}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <ChevronLeft color={colors.text} size={22} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: actionBtnSize }} />
                    )}
                    <Text style={[styles.centerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                    <View style={[styles.rightSlot, { minWidth: actionBtnSize }]}>{right}</View>
                </View>
            ) : (
                <View style={{ gap: spacing.sm }}>
                    <View style={[styles.row, { gap: spacing.sm, alignItems: 'center' }]}>
                        {onBack ? (
                            <TouchableOpacity
                                onPress={onBack}
                                style={[styles.actionBtn, {
                                    width: actionBtnSize,
                                    height: actionBtnSize,
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    borderRadius: radius.md,
                                }]}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <ChevronLeft color={colors.text} size={22} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: actionBtnSize }} />
                        )}
                        <View style={[styles.rightSlot, { flex: 1 }]}>{right}</View>
                    </View>
                    <View style={[styles.titleBlock, onBack ? { paddingLeft: actionBtnSize + spacing.sm } : null]}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
                        {subtitle ? (
                            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        borderBottomWidth: 1,
    },
    row: {
        flexDirection: 'row',
    },
    actionBtn: {
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleBlock: {},
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    centerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    rightSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
});
