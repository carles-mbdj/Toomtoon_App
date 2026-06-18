import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { historyApi } from '../src/services/api';
import { LoadingSpinner } from '../src/components/LoadingSpinner';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isAdmin, user, logout, updateProfile, changePassword, deleteAccount, error, clearError } = useAuthStore();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [notifications, setNotifications] = useState(user?.notifications_enabled !== false);

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username,
        email: user.email,
      });
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

  const handleUpdateProfile = async () => {
    if (!profileData.username || !profileData.email) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    const success = await updateProfile(profileData);
    if (success) {
      Alert.alert('Succès', 'Profil mis à jour');
      setShowProfileModal(false);
    } else {
      Alert.alert('Erreur', error || 'Une erreur est survenue');
      clearError();
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    const success = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    if (success) {
      Alert.alert('Succès', 'Mot de passe modifié');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      Alert.alert('Erreur', error || 'Mot de passe actuel incorrect');
      clearError();
    }
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

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await historyApi.get();
      setHistory(response.data);
    } catch (error) {
      console.log('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Effacer l\'historique',
      'Voulez-vous vraiment effacer tout l\'historique de lecture?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await historyApi.clear();
              setHistory([]);
              Alert.alert('Succès', 'Historique effacé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'effacer l\'historique');
            }
          },
        },
      ]
    );
  };

  const openHistoryModal = () => {
    setShowHistoryModal(true);
    loadHistory();
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    danger = false,
    rightComponent,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !rightComponent}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons
          name={icon as any}
          size={22}
          color={danger ? Colors.error : Colors.primary}
        />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      ))}
    </TouchableOpacity>
  );

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

        {/* Admin Access */}
        {isAdmin ? (
          <TouchableOpacity
            style={styles.adminBanner}
            onPress={() => router.push('/admin/dashboard')}
          >
            <Ionicons name="shield-checkmark" size={24} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.adminBannerTitle}>Administration</Text>
              <Text style={styles.adminBannerSubtitle}>Accéder au tableau de bord</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gold} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.adminLink}
            onPress={() => router.push('/admin')}
          >
            <Ionicons name="shield-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.adminLinkText}>Accès administrateur</Text>
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
              onPress={openHistoryModal}
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
            onPress={() => Alert.alert('Aide', 'Centre d\'aide à venir')}
          />
          <SettingItem
            icon="mail-outline"
            title="Nous contacter"
            onPress={() => Alert.alert('Contact', 'support@toomtoon.com')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Conditions d'utilisation"
            onPress={() => Alert.alert('CGU', 'Conditions d\'utilisation à venir')}
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

      {/* Profile Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le profil</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={styles.input}
              value={profileData.username}
              onChangeText={(text) => setProfileData({ ...profileData, username: text })}
              placeholder="Votre nom"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Mot de passe actuel</Text>
            <TextInput
              style={styles.input}
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />

            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />

            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
              <Text style={styles.saveButtonText}>Changer le mot de passe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historique de lecture</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <LoadingSpinner text="Chargement..." />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="time-outline" size={50} color={Colors.textMuted} />
                <Text style={styles.emptyHistoryText}>Aucun historique</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {history.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => {
                      setShowHistoryModal(false);
                      router.push(`/webtoon/${item.webtoon_id}`);
                    }}
                  >
                    <View style={styles.historyImage}>
                      <Ionicons name="book" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>{item.webtoon_title}</Text>
                      <Text style={styles.historyEpisode}>
                        Épisode {item.episode_number} • Page {item.last_page + 1}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity style={styles.clearHistoryButton} onPress={clearHistory}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={styles.clearHistoryText}>Effacer l'historique</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  adminBannerTitle: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  adminBannerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    gap: 6,
  },
  adminLinkText: {
    color: Colors.textMuted,
    fontSize: 13,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  settingTitleDanger: {
    color: Colors.error,
  },
  settingSubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginTop: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  historyEpisode: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 10,
    gap: 8,
  },
  clearHistoryText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
