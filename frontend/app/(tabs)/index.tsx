import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/Header';
import { WebtoonCard } from '../../src/components/WebtoonCard';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { useAuthStore } from '../../src/store/authStore';
import { useFeaturedWebtoons, useRecentEpisodes, useWebtoons } from '../../src/hooks/queries';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const featuredQuery = useFeaturedWebtoons();
  const recentQuery = useRecentEpisodes();
  const allQuery = useWebtoons();

  const featuredWebtoons = featuredQuery.data ?? [];
  const recentEpisodes = recentQuery.data ?? [];
  const allWebtoons = allQuery.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([featuredQuery.refetch(), recentQuery.refetch(), allQuery.refetch()]);
    setRefreshing(false);
  };

  if (featuredQuery.isLoading || recentQuery.isLoading || allQuery.isLoading) {
    return <LoadingSpinner fullScreen text="Chargement des webtoons..." />;
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Auth Banner */}
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.authBanner}
            onPress={() => router.push('/auth')}
          >
            <Ionicons name="person-circle" size={24} color={Colors.white} />
            <Text style={styles.authBannerText}>
              Inscrivez-vous pour accéder à tous les épisodes
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}

        {/* Featured Webtoons Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Webtoons en Exclusivité</Text>
          <FlatList
            horizontal
            data={featuredWebtoons}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <WebtoonCard
                {...item}
                size="large"
                onPress={() => router.push(`/webtoon/${item.id}`)}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Recent Episodes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Épisodes Récents</Text>
          <FlatList
            horizontal
            data={recentEpisodes.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentEpisode}
                onPress={() => router.push(`/webtoon/${item.webtoon_id}`)}
              >
                <View style={styles.recentEpisodeImage}>
                  <Ionicons name="play-circle" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.recentEpisodeTitle} numberOfLines={1}>
                  {item.webtoon_title}
                </Text>
                <Text style={styles.recentEpisodeNumber}>
                  Ép. {item.number}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* All Webtoons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Séries en cours</Text>
          <FlatList
            horizontal
            data={allWebtoons.filter((w) => w.status === 'ongoing')}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <WebtoonCard
                {...item}
                size="medium"
                onPress={() => router.push(`/webtoon/${item.id}`)}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Magazine Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Magazine du Webtoon</Text>
          <TouchableOpacity style={styles.magazineCard} onPress={() => router.push('/magazine')}>
            <View style={styles.magazineIcon}>
              <Ionicons name="newspaper" size={40} color={Colors.primary} />
            </View>
            <View style={styles.magazineInfo}>
              <Text style={styles.magazineTitle}>Toom-Mag</Text>
              <Text style={styles.magazineDesc}>
                Découvrez les actualités et interviews des auteurs africains
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
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
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  authBannerText: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  recentEpisode: {
    width: 100,
    marginRight: 12,
  },
  recentEpisodeImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentEpisodeTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  recentEpisodeNumber: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  magazineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  magazineIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  magazineInfo: {
    flex: 1,
  },
  magazineTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  magazineDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
