import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { Edge, SafeAreaView as ContextSafeAreaView } from 'react-native-safe-area-context';

// On Android the theme's `headerTop` already reserves the status bar, so insets are applied on iOS only,
// the same way the deprecated SafeAreaView from react-native behaved.
const EDGES: Edge[] = Platform.OS === 'ios' ? ['top', 'right', 'bottom', 'left'] : [];

interface Props {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}

export function SafeAreaView({ style, children }: Props) {
    return (
        <ContextSafeAreaView style={style} edges={EDGES}>
            {children}
        </ContextSafeAreaView>
    );
}
