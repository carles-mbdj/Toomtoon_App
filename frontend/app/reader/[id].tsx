import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  StatusBar,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { episodesApi } from '../../src/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ReaderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  
  const [episode, setEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetchEpisode();
    StatusBar.setHidden(true);
    return () => StatusBar.setHidden(false);
  }, [id]);

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showControls]);

  const fetchEpisode = async () => {
    try {
      const response = await episodesApi.getById(id as string);
      setEpisode(response.data);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Impossible de charger l\'épisode';
      Alert.alert('Erreur', message, [
        { text: 'Retour', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalHeight = contentSize.height - layoutMeasurement.height;
    const progress = totalHeight > 0 ? (contentOffset.y / totalHeight) * 100 : 0;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
    
    // Calculate current page based on scroll position
    const pageHeight = width * (4/3); // Aspect ratio 3:4
    const page = Math.floor(contentOffset.y / pageHeight);
    setCurrentPage(Math.max(0, page));
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement de l'épisode..." />;
  }

  if (!episode) {
    return (
      <View style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={60} color={Colors.error} />
          <Text style={styles.errorText}>Épisode non disponible</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Use actual pages or generate demo pages
  const pages = episode.pages && episode.pages.length > 0
    ? episode.pages.map((img: string, i: number) => ({ id: i, image: img }))
    : Array.from({ length: 10 }, (_, i) => ({ id: i, isDemo: true }));

  const totalPages = pages.length;

  return (
    <View style={styles.container}>
      {/* Reader Content - Vertical Scroll */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={toggleControls}
      >
        {pages.map((page: any, index: number) => (
          <View key={page.id} style={styles.page}>
            {page.isDemo ? (
              <View style={styles.demoPageContent}>
                <Ionicons name="image" size={60} color={Colors.primary} />
                <Text style={styles.pageText}>Page {index + 1}</Text>
                <Text style={styles.pageHint}>Défilez verticalement ↓</Text>
              </View>
            ) : (
              <Image 
                source={{ uri: page.image }} 
                style={styles.pageImage}
                resizeMode="contain"
              />
            )}
          </View>
        ))}
        
        {/* End of episode */}
        <View style={styles.endSection}>
          <Ionicons name="checkmark-circle" size={60} color={Colors.success} />
          <Text style={styles.endTitle}>Fin de l'épisode</Text>
          <Text style={styles.endSubtitle}>{episode.title}</Text>
          <TouchableOpacity style={styles.nextButton} onPress={() => router.back()}>
            <Text style={styles.nextButtonText}>Retour au webtoon</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Top Controls */}
      <Animated.View 
        style={[
          styles.topControls, 
          { paddingTop: insets.top + 10, opacity: controlsOpacity }
        ]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.controlButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.episodeTitle} numberOfLines={1}>{episode.title}</Text>
          <Text style={styles.pageIndicator}>
            {currentPage + 1} / {totalPages}
          </Text>
        </View>
        <TouchableOpacity style={styles.controlButton} onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={22} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>

      {/* Progress Bar (right side) */}
      <Animated.View 
        style={[styles.progressBarContainer, { opacity: controlsOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { height: `${scrollProgress}%` }]} />
        </View>
      </Animated.View>

      {/* Bottom Progress */}
      <Animated.View 
        style={[
          styles.bottomBar, 
          { paddingBottom: insets.bottom + 10, opacity: controlsOpacity }
        ]}
        pointerEvents="none"
      >
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>{Math.round(scrollProgress)}%</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  backButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  episodeTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pageIndicator: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  page: {
    width: width,
    minHeight: width * (4/3), // Maintain 3:4 aspect ratio
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    width: width,
    height: width * (4/3),
  },
  demoPageContent: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    margin: 20,
  },
  pageText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  pageHint: {
    color: Colors.primary,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  progressBarContainer: {
    position: 'absolute',
    right: 8,
    top: '20%',
    bottom: '20%',
    width: 4,
    justifyContent: 'center',
  },
  progressBarTrack: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  progressInfo: {
    alignItems: 'center',
  },
  progressText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  endSection: {
    alignItems: 'center',
    padding: 40,
    paddingBottom: 100,
  },
  endTitle: {
    color: Colors.success,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  endSubtitle: {
    color: Colors.textMuted,
    fontSize: 16,
    marginTop: 8,
  },
  nextButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
