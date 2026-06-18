import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/Header';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { scheduleApi } from '../../src/services/api';
import { DAYS } from '../../src/constants/genres';

export default function CalendarScreen() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>({});
  const [selectedDay, setSelectedDay] = useState('lundi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = async () => {
    try {
      const response = await scheduleApi.get();
      setSchedule(response.data);
    } catch (error) {
      console.log('Error fetching schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    
    // Set current day as default
    const today = new Date().getDay();
    const dayMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    setSelectedDay(dayMap[today] || 'lundi');
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement du calendrier..." />;
  }

  const currentDayWebtoons = schedule[selectedDay] || [];

  return (
    <View style={styles.container}>
      <Header />
      
      {/* Day Selector */}
      <View style={styles.daySelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorContent}
        >
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayButton,
                selectedDay === day.id && styles.dayButtonActive,
              ]}
              onPress={() => setSelectedDay(day.id)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  selectedDay === day.id && styles.dayButtonTextActive,
                ]}
              >
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
          <Text style={styles.title}>Grille de Diffusion</Text>
          <Text style={styles.subtitle}>
            {currentDayWebtoons.length} série(s) ce jour
          </Text>
        </View>

        {currentDayWebtoons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucune diffusion ce jour</Text>
          </View>
        ) : (
          currentDayWebtoons.map((webtoon: any) => (
            <TouchableOpacity
              key={webtoon.id}
              style={styles.webtoonCard}
              onPress={() => router.push(`/webtoon/${webtoon.id}`)}
            >
              <View style={styles.webtoonImage}>
                <Ionicons name="book" size={30} color={Colors.primary} />
              </View>
              <View style={styles.webtoonInfo}>
                <Text style={styles.webtoonTitle}>{webtoon.title}</Text>
                <Text style={styles.webtoonAuthor}>{webtoon.author}</Text>
                <View style={styles.webtoonMeta}>
                  <View style={styles.genreBadge}>
                    <Text style={styles.genreText}>{webtoon.genre}</Text>
                  </View>
                  <Text style={styles.episodeCount}>
                    {webtoon.total_episodes} épisodes
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          ))
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
  daySelector: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
  },
  daySelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
  },
  dayButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dayButtonTextActive: {
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
  webtoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
  },
  webtoonImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  webtoonInfo: {
    flex: 1,
  },
  webtoonTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  webtoonAuthor: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  webtoonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  genreBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genreText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  episodeCount: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
