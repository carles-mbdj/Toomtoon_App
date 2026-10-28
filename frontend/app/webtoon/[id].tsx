import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/Header';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { WebtoonHero } from '../../src/components/webtoon/WebtoonHero';
import { EpisodesList } from '../../src/components/webtoon/EpisodesList';
import { CommentsSection } from '../../src/components/comments/CommentsSection';
import { useAuthStore } from '../../src/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Episode } from '../../src/types';
import { useEpisodesByWebtoon, useWebtoon } from '../../src/hooks/queries';

export default function WebtoonDetailScreen() {
  const { id } = useLocalSearchParams();
  const webtoonId = id as string;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();

  const webtoonQuery = useWebtoon(webtoonId);
  const episodesQuery = useEpisodesByWebtoon(webtoonId);

  const webtoon = webtoonQuery.data ?? null;
  const episodes = episodesQuery.data ?? [];
  const loading = webtoonQuery.isLoading || episodesQuery.isLoading;

  const handleEpisodePress = (episode: Episode) => {
    // Check if webtoon is ongoing and episode is not free
    if (webtoon?.status === 'ongoing' && !episode.is_free) {
      if (!isAuthenticated) {
        Alert.alert(
          'Connexion requise',
          'Connectez-vous pour accéder aux épisodes premium',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => router.push('/auth') },
          ]
        );
        return;
      }
      if (!user?.subscription_type) {
        Alert.alert(
          'Abonnement requis',
          'Ce webtoon est en cours de publication. Abonnez-vous pour accéder aux épisodes premium.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: "S'abonner", onPress: () => router.push('/(tabs)/subscription') },
          ]
        );
        return;
      }
    }

    // Regular premium check for completed webtoons
    if (!episode.is_free) {
      if (!isAuthenticated) {
        Alert.alert(
          'Connexion requise',
          'Connectez-vous pour accéder à cet épisode',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => router.push('/auth') },
          ]
        );
        return;
      }
      if (!user?.subscription_type) {
        Alert.alert(
          'Abonnement requis',
          'Abonnez-vous pour accéder à tous les épisodes',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: "S'abonner", onPress: () => router.push('/(tabs)/subscription') },
          ]
        );
        return;
      }
    }
    router.push(`/reader/${episode.id}`);
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement..." />;
  }

  if (!webtoon) {
    return (
      <View style={styles.container}>
        <Header showBack showLogo={false} title="Erreur" />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={60} color={Colors.error} />
          <Text style={styles.errorText}>Webtoon non trouvé</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header showBack showLogo={false} title={webtoon.title} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <WebtoonHero webtoon={webtoon} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.description}>{webtoon.description}</Text>
        </View>

        <EpisodesList episodes={episodes} onEpisodePress={handleEpisodePress} />

        <CommentsSection webtoonId={webtoonId} previewCount={3} />

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginTop: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});
