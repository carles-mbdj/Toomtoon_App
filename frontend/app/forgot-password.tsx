import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { passwordApi } from '../src/services/api';
import { LoadingSpinner } from '../src/components/LoadingSpinner';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoCode, setDemoCode] = useState('');

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      const response = await passwordApi.forgotPassword(email);
      if (response.data.demo_code) {
        setDemoCode(response.data.demo_code);
      }
      Alert.alert('Succès', 'Un code de réinitialisation a été envoyé');
      setStep(2);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      await passwordApi.verifyCode(email, code);
      setStep(3);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await passwordApi.resetPassword(email, code, newPassword);
      Alert.alert('Succès', 'Votre mot de passe a été réinitialisé', [
        { text: 'OK', onPress: () => router.replace('/auth') },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Entrez votre email pour recevoir un code de réinitialisation'}
            {step === 2 && 'Entrez le code reçu par email'}
            {step === 3 && 'Créez votre nouveau mot de passe'}
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, step >= s && styles.progressDotActive]}
            />
          ))}
        </View>

        {/* Step 1: Email */}
        {step === 1 && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Text style={styles.buttonText}>Envoyer le code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Code */}
        {step === 2 && (
          <View style={styles.form}>
            {demoCode && (
              <View style={styles.demoCodeBox}>
                <Ionicons name="information-circle" size={20} color={Colors.warning} />
                <Text style={styles.demoCodeText}>
                  Mode démo - Code: {demoCode}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Code à 6 chiffres"
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Text style={styles.buttonText}>Vérifier le code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => setStep(1)}>
              <Text style={styles.linkText}>Renvoyer le code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nouveau mot de passe"
                placeholderTextColor={Colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Text style={styles.buttonText}>Réinitialiser</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { color: Colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.surfaceLight },
  progressDotActive: { backgroundColor: Colors.primary },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4, gap: 12 },
  input: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 14 },
  button: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: Colors.surfaceLight },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', padding: 12 },
  linkText: { color: Colors.primary, fontSize: 14 },
  demoCodeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 193, 7, 0.1)', padding: 12, borderRadius: 10, gap: 10 },
  demoCodeText: { color: Colors.warning, fontSize: 13, flex: 1 },
});
