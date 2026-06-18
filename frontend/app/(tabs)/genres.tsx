import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/Header';
import { WebtoonCard } from '../../src/components/WebtoonCard';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { webtoonsApi } from '../../src/services/api';
import { GENRES } from '../../src/constants/genres';

export default function GenresScreen() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [webtoons, setWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWebtoons = async (genre?: string) => {
    try {
      const response = await webtoonsApi.getAll(
        genre ? { genre } : undefined
      );
      setWebtoons(response.data);
    } catch (error) {
      console.log('Error fetching webtoons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWebtoons(selectedGenre || undefined);
  }, [selectedGenre]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWebtoons(selectedGenre || undefined);
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement des genres..." />;
  }

  return (
    <View style={styles.container}>
      <Header />

      {/* Genre Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.genreScroll}
        contentContainerStyle={styles.genreScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.genrePill,
            !selectedGenre && styles.genrePillActive,
          ]}
          onPress={() => setSelectedGenre(null)}
        >
          <Ionicons
            name="apps"
            size={18}
            color={!selectedGenre ? Colors.white : Colors.textSecondary}
          />
          <Text
            style={[
              styles.genrePillText,
              !selectedGenre && styles.genrePillTextActive,
            ]}
          >
            Tous
          </Text>
        </TouchableOpacity>
        {GENRES.map((genre) => (
          <TouchableOpacity
            key={genre.id}
            style={[
              styles.genrePill,
              selectedGenre === genre.id && styles.genrePillActive,
            ]}
            onPress={() => setSelectedGenre(genre.id)}
          >
            <Ionicons
              name={genre.icon as any}
              size={18}
              color={
                selectedGenre === genre.id
                  ? Colors.white
                  : Colors.textSecondary
              }
            />
            <Text
              style={[
                styles.genrePillText,
                selectedGenre === genre.id && styles.genrePillTextActive,
              ]}
            >
              {genre.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
        <View style={styles.header}>
          <Text style={styles.title}>
            {selectedGenre || 'Tous les genres'}
          </Text>
          <Text style={styles.subtitle}>
            {webtoons.length} série(s) trouvée(s)
          </Text>
        </View>

        {/* Webtoons Grid */}
        <View style={styles.grid}>
          {webtoons.map((webtoon: any) => (
            <View key={webtoon.id} style={styles.gridItem}>
              <WebtoonCard
                {...webtoon}
                size="medium"
                onPress={() => router.push(`/webtoon/${webtoon.id}`)}
              />
            </View>
          ))}
        </View>

        {webtoons.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={60} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucune série dans ce genre</Text>
          </View>
        )}

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
  genreScroll: {
    maxHeight: 50,
    backgroundColor: Colors.surface,
  },
  genreScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  genrePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  genrePillActive: {
    backgroundColor: Colors.primary,
  },
  genrePillText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  genrePillTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginTop: 16,
  },
});
