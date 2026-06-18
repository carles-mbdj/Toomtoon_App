import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebtoonCard } from '../src/components/WebtoonCard';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { webtoonsApi } from '../src/services/api';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search when query changes (with debounce)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await webtoonsApi.getAll({ search: query });
      setResults(response.data);
    } catch (error) {
      console.log('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un webtoon..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <LoadingSpinner text="Recherche en cours..." />
        ) : hasSearched ? (
          <>
            <Text style={styles.resultsTitle}>
              {results.length} résultat(s) pour "{query}"
            </Text>
            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={60} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Aucun webtoon trouvé</Text>
                <Text style={styles.emptyHint}>
                  Essayez avec d'autres mots-clés
                </Text>
              </View>
            ) : (
              <View style={styles.resultsGrid}>
                {results.map((webtoon) => (
                  <View key={webtoon.id} style={styles.resultItem}>
                    <TouchableOpacity
                      style={styles.resultCard}
                      onPress={() => router.push(`/webtoon/${webtoon.id}`)}
                    >
                      <View style={styles.resultImage}>
                        <Ionicons name="book" size={30} color={Colors.primary} />
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle}>{webtoon.title}</Text>
                        <Text style={styles.resultAuthor}>{webtoon.author}</Text>
                        <View style={styles.resultMeta}>
                          <View style={styles.genreBadge}>
                            <Text style={styles.genreText}>{webtoon.genre}</Text>
                          </View>
                          <Text style={styles.episodeCount}>
                            Saison {webtoon.season}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.initialState}>
            <Ionicons name="search" size={80} color={Colors.surfaceLight} />
            <Text style={styles.initialText}>
              Recherchez vos webtoons préférés
            </Text>
            <Text style={styles.initialHint}>
              Tapez un titre ou un nom d'auteur
            </Text>
          </View>
        )}
      </ScrollView>
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
    padding: 16,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  resultsTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  resultsGrid: {
    paddingHorizontal: 16,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
  },
  resultImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultAuthor: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  resultMeta: {
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
  emptyHint: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  initialState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  initialText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
  },
  initialHint: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
});
