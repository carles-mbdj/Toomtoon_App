import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { SettingItem } from '../src/components/SettingItem';
import { ProfileModal } from '../src/components/settings/ProfileModal';
import { PasswordModal } from '../src/components/settings/PasswordModal';
import { HistoryModal } from '../src/components/settings/HistoryModal';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, logout, updateProfile, deleteAccount } = useAuthStore();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [notifications, setNotifications] = useState(user?.notifications_enabled !== false);

  useEffect(() => {
    if (user) {
      setNotifications(user.notifications_enabled !== false);
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await updateProfile({ notifications_enabled: value });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation',
              'Êtes-vous vraiment sûr?',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer définitivement',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAccount();
                    if (success) {
                      router.replace('/(tabs)');
                    } else {
                      Alert.alert('Erreur', 'Impossible de supprimer le compte');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réglages</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        {isAuthenticated && user ? (
          <View style={styles.profileSection}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.username}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              {user.subscription_type && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={12} color={Colors.gold} />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setShowProfileModal(true)}
            >
              <Ionicons name="pencil" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => router.push('/auth')}
          >
            <Ionicons name="person-circle" size={40} color={Colors.primary} />
            <View style={styles.loginPromptInfo}>
              <Text style={styles.loginPromptTitle}>Connexion</Text>
              <Text style={styles.loginPromptSubtitle}>
                Connectez-vous pour accéder à toutes les fonctionnalités
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Settings Groups */}
        {isAuthenticated && (
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>Compte</Text>
            <SettingItem
              icon="person-outline"
              title="Modifier le profil"
              subtitle="Nom d'utilisateur et email"
              onPress={() => setShowProfileModal(true)}
            />
            <SettingItem
              icon="lock-closed-outline"
              title="Changer le mot de passe"
              subtitle="Sécurisez votre compte"
              onPress={() => setShowPasswordModal(true)}
            />
            <SettingItem
              icon="key-outline"
              title="Abonnement"
              subtitle={user?.subscription_type ? 'Premium actif' : 'Gratuit'}
              onPress={() => router.push('/(tabs)/subscription')}
            />
            <SettingItem
              icon="time-outline"
              title="Historique de lecture"
              subtitle="Voir vos lectures récentes"
              onPress={() => setShowHistoryModal(true)}
            />
          </View>
        )}

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Application</Text>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle={notifications ? 'Activées' : 'Désactivées'}
            showArrow={false}
            rightComponent={
              isAuthenticated ? (
                <Switch
                  value={notifications}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.success }}
                  thumbColor={Colors.white}
                />
              ) : undefined
            }
            onPress={!isAuthenticated ? () => router.push('/auth') : undefined}
          />
          <SettingItem
            icon="moon-outline"
            title="Apparence"
            subtitle="Thème sombre"
            showArrow={false}
          />
          <SettingItem
            icon="language-outline"
            title="Langue"
            subtitle="Français"
            onPress={() => Alert.alert('Langue', 'Seul le français est disponible pour le moment')}
          />
          <SettingItem
            icon="download-outline"
            title="Téléchargements"
            subtitle="Gérer les contenus hors-ligne"
            onPress={() => Alert.alert('Téléchargements', 'Fonctionnalité à venir')}
          />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Support</Text>
          <SettingItem
            icon="help-circle-outline"
            title="Aide & FAQ"
            onPress={() => Alert.alert('Aide', "Centre d'aide à venir")}
          />
          <SettingItem
            icon="mail-outline"
            title="Nous contacter"
            onPress={() => Alert.alert('Contact', 'support@toomtoon.com')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Conditions d'utilisation"
            onPress={() => Alert.alert('CGU', "Conditions d'utilisation à venir")}
          />
          <SettingItem
            icon="shield-outline"
            title="Politique de confidentialité"
            onPress={() => Alert.alert('Confidentialité', 'Politique de confidentialité à venir')}
          />
        </View>

        {isAuthenticated && (
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="log-out-outline"
              title="Déconnexion"
              onPress={handleLogout}
              danger
              showArrow={false}
            />
            <SettingItem
              icon="trash-outline"
              title="Supprimer mon compte"
              onPress={handleDeleteAccount}
              danger
              showArrow={false}
            />
          </View>
        )}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>ToomToon v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 ToomToon - Tous droits réservés</Text>
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      <ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <PasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <HistoryModal visible={showHistoryModal} onClose={() => setShowHistoryModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitial: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  premiumText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  loginPromptInfo: {
    flex: 1,
    marginLeft: 12,
  },
  loginPromptTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loginPromptSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  groupTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  copyrightText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
