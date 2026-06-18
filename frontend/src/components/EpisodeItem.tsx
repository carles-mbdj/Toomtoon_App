import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface EpisodeItemProps {
  number: number;
  title: string;
  is_free: boolean;
  views?: number;
  onPress: () => void;
}

export const EpisodeItem: React.FC<EpisodeItemProps> = ({
  number,
  title,
  is_free,
  views,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.numberContainer}>
        <Text style={styles.number}>{number}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        {views !== undefined && (
          <View style={styles.viewsContainer}>
            <Ionicons name="eye-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.views}>{views.toLocaleString()}</Text>
          </View>
        )}
      </View>
      <View style={styles.badge}>
        {is_free ? (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>GRATUIT</Text>
          </View>
        ) : (
          <View style={styles.premiumBadge}>
            <Ionicons name="key" size={14} color={Colors.gold} />
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  numberContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  number: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  views: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  badge: {
    marginRight: 8,
  },
  freeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  premiumBadge: {
    padding: 4,
  },
});
