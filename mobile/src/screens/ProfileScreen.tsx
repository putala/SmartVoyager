import React, { useState, useMemo } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from '../components/ui/SafeAreaView';
import { User, Lock, Save, ChevronRight, Sparkles, Settings, Trash2 } from 'lucide-react-native';
import { userService } from '../api/userService';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen({ navigation }: any) {
    const { colors, common, spacing, radius } = useTheme();
    const { user, setAuth, logout } = useAuthStore();
    const [info, setInfo] = useState({ username: user?.username || '', email: user?.email || '' });
    const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [deletePassword, setDeletePassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = () => {
        if (!deletePassword) return Alert.alert('Błąd', 'Podaj hasło, aby potwierdzić usunięcie konta.');
        Alert.alert('Usuń konto', 'Usunąć konto razem ze wszystkimi wycieczkami? Tej operacji nie można cofnąć.', [
            { text: 'Anuluj', style: 'cancel' },
            {
                text: 'Usuń',
                style: 'destructive',
                onPress: async () => {
                    setLoading(true);
                    try {
                        await userService.deleteMyAccount(deletePassword);
                        logout();
                    } catch (err: any) {
                        Alert.alert('Błąd', err.response?.data?.message || 'Usunięcie konta nie powiodło się.');
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    const handleUpdateInfo = async () => {
        if (!info.username || !info.email) return Alert.alert('Błąd', 'Wypełnij wszystkie pola.');
        setLoading(true);
        try {
            await userService.updateProfile(info);
            setAuth({ ...user, ...info }, useAuthStore.getState().token || '');
            Alert.alert('Sukces', 'Profil zaktualizowany.');
        } catch (err: any) {
            Alert.alert('Błąd', err.response?.data?.message || 'Aktualizacja nie powiodła się.');
        } finally { setLoading(false); }
    };

    const handleChangePass = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) {
            return Alert.alert('Błąd', 'Nowe hasła nie są identyczne.');
        }
        setLoading(true);
        try {
            await userService.changePassword({ oldPassword: passwords.oldPassword, newPassword: passwords.newPassword });
            Alert.alert('Sukces', 'Hasło zmienione.');
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            Alert.alert('Błąd', err.response?.data?.message || 'Zmiana hasła nie powiodła się.');
        } finally { setLoading(false); }
    };

    const styles = useMemo(() => StyleSheet.create({
        scroll: { padding: spacing.lg },
        cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
        inputMb: { marginBottom: spacing.md },
        linkCard: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
        },
        linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        iconBox: { padding: 10, backgroundColor: colors.elevated, borderRadius: radius.md },
        linkTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
        linkSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
        dangerBtn: {
            alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
            borderRadius: radius.md, borderWidth: 1, borderColor: colors.error,
        },
    }), [colors, spacing, radius]);

    return (
        <SafeAreaView style={common.screen}>
            <ScreenHeader title="Mój profil" subtitle="Dane konta i hasło" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={common.card}>
                    <View style={styles.cardHeader}>
                        <User size={18} color={colors.textSecondary} />
                        <Text style={common.sectionTitle}>Podstawowe informacje</Text>
                    </View>

                    <Text style={common.label}>Nazwa użytkownika</Text>
                    <TextInput style={[common.input, styles.inputMb]} value={info.username} onChangeText={(t) => setInfo({ ...info, username: t })} />

                    <Text style={common.label}>Adres e-mail</Text>
                    <TextInput style={[common.input, styles.inputMb]} value={info.email} keyboardType="email-address" onChangeText={(t) => setInfo({ ...info, email: t })} />

                    <TouchableOpacity style={common.primaryBtn} onPress={handleUpdateInfo} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.onAccent} /> : (
                            <>
                                <Save size={18} color={colors.onAccent} />
                                <Text style={common.primaryBtnText}>Zapisz zmiany</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('UserPreferences')}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.iconBox, { backgroundColor: colors.accentMuted }]}>
                            <Sparkles size={20} color={colors.text} />
                        </View>
                        <View>
                            <Text style={styles.linkTitle}>Preferencje podróży</Text>
                            <Text style={styles.linkSub}>Zainteresowania i styl podróży</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('Settings')}>
                    <View style={styles.linkLeft}>
                        <View style={styles.iconBox}>
                            <Settings size={20} color={colors.textSecondary} />
                        </View>
                        <View>
                            <Text style={styles.linkTitle}>Wygląd</Text>
                            <Text style={styles.linkSub}>Motyw, kolory i układ</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={common.card}>
                    <View style={styles.cardHeader}>
                        <Lock size={18} color={colors.rose} />
                        <Text style={common.sectionTitle}>Bezpieczeństwo</Text>
                    </View>

                    <TextInput style={[common.input, styles.inputMb]} placeholder="Obecne hasło" placeholderTextColor={colors.textMuted} secureTextEntry value={passwords.oldPassword} onChangeText={(t) => setPasswords({ ...passwords, oldPassword: t })} />
                    <TextInput style={[common.input, styles.inputMb]} placeholder="Nowe hasło" placeholderTextColor={colors.textMuted} secureTextEntry value={passwords.newPassword} onChangeText={(t) => setPasswords({ ...passwords, newPassword: t })} />
                    <TextInput style={[common.input, styles.inputMb]} placeholder="Powtórz nowe hasło" placeholderTextColor={colors.textMuted} secureTextEntry value={passwords.confirmPassword} onChangeText={(t) => setPasswords({ ...passwords, confirmPassword: t })} />

                    <TouchableOpacity style={common.primaryBtn} onPress={handleChangePass}>
                        <Text style={common.primaryBtnText}>Zaktualizuj hasło</Text>
                    </TouchableOpacity>
                </View>

                <View style={common.card}>
                    <View style={styles.cardHeader}>
                        <Trash2 size={18} color={colors.error} />
                        <Text style={common.sectionTitle}>Usuń konto</Text>
                    </View>
                    <Text style={[styles.linkSub, styles.inputMb]}>
                        Konto zostanie trwale usunięte razem ze wszystkimi wycieczkami i punktami trasy.
                    </Text>
                    <TextInput style={[common.input, styles.inputMb]} placeholder="Hasło (potwierdzenie)" placeholderTextColor={colors.textMuted} secureTextEntry value={deletePassword} onChangeText={setDeletePassword} />
                    <TouchableOpacity
                        style={[styles.dangerBtn, loading && { opacity: 0.6 }]}
                        onPress={handleDeleteAccount}
                        disabled={loading}
                    >
                        <Text style={{ color: colors.error, fontWeight: '600', fontSize: 15 }}>Usuń konto</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
