import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface WebtoonCardProps {
  id: string;
  title: string;
  author: string;
  genre: string;
  cover_image?: string;
  views?: number;
  total_episodes?: number;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const WebtoonCard: React.FC<WebtoonCardProps> = ({
  title,
  author,
  genre,
  cover_image,
  views,
  total_episodes,
  onPress,
  size = 'medium',
}) => {
  const cardStyle = size === 'small' ? styles.cardSmall : size === 'large' ? styles.cardLarge : styles.cardMedium;
  const imageStyle = size === 'small' ? styles.imageSmall : size === 'large' ? styles.imageLarge : styles.imageMedium;

  return (
    <TouchableOpacity style={[styles.card, cardStyle]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.imageContainer, imageStyle]}>
        {cover_image ? (
          <Image source={{ uri: cover_image }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="book" size={40} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{genre}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.author} numberOfLines={1}>{author}</Text>
        {(views !== undefined || total_episodes !== undefined) && (
          <View style={styles.stats}>
            {views !== undefined && (
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.statText}>{(views / 1000).toFixed(1)}k</Text>
              </View>
            )}
            {total_episodes !== undefined && (
              <View style={styles.stat}>
                <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.statText}>{total_episodes} ép.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  cardSmall: {
    width: 120,
  },
  cardMedium: {
    width: 150,
  },
  cardLarge: {
    width: 180,
  },
  imageContainer: {
    position: 'relative',
  },
  imageSmall: {
    height: 160,
  },
  imageMedium: {
    height: 200,
  },
  imageLarge: {
    height: 240,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    padding: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
