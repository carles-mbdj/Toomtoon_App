import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import type { Webtoon } from '../../types';

interface WebtoonHeroProps {
  webtoon: Webtoon;
}

export const WebtoonHero: React.FC<WebtoonHeroProps> = ({ webtoon }) => (
  <View style={styles.hero}>
    <View style={styles.coverImage}>
      {webtoon.cover_image ? (
        <Image
          source={{ uri: webtoon.cover_image }}
          style={styles.coverImg}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
        />
      ) : (
        <Ionicons name="book" size={60} color={Colors.primary} />
      )}
    </View>
    <View style={styles.heroInfo}>
      <Text style={styles.title}>{webtoon.title}</Text>
      <Text style={styles.author}>par {webtoon.author}</Text>
      <View style={styles.metaRow}>
        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{webtoon.genre}</Text>
        </View>
        {webtoon.status === 'ongoing' ? (
          <View style={styles.ongoingBadge}>
            <Text style={styles.ongoingText}>En cours</Text>
          </View>
        ) : (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Terminé</Text>
          </View>
        )}
        <Text style={styles.season}>Saison {webtoon.season}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="eye" size={16} color={Colors.textMuted} />
          <Text style={styles.statText}>{(webtoon.views / 1000).toFixed(1)}k vues</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="layers" size={16} color={Colors.textMuted} />
          <Text style={styles.statText}>{webtoon.total_episodes} épisodes</Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  genreBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  ongoingBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ongoingText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  season: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
