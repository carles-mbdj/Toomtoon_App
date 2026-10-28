import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { EpisodeItem } from '../EpisodeItem';
import type { Episode } from '../../types';

interface EpisodesListProps {
  episodes: Episode[];
  onEpisodePress: (episode: Episode) => void;
}

export const EpisodesList: React.FC<EpisodesListProps> = ({ episodes, onEpisodePress }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Épisodes</Text>
      <View style={styles.freeInfo}>
        <Ionicons name="gift" size={14} color={Colors.success} />
        <Text style={styles.freeInfoText}>4 premiers gratuits</Text>
      </View>
    </View>

    <View>
      {episodes.map((episode) => (
        <EpisodeItem
          key={episode.id}
          number={episode.number}
          title={episode.title}
          is_free={episode.is_free}
          views={episode.views}
          onPress={() => onEpisodePress(episode)}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  freeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freeInfoText: {
    color: Colors.success,
    fontSize: 12,
  },
});
