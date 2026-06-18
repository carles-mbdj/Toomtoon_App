import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { articlesApi } from '../src/services/api';

const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: 'newspaper' },
  { id: 'news', name: 'Actualités', icon: 'megaphone' },
  { id: 'interview', name: 'Interviews', icon: 'mic' },
  { id: 'review', name: 'Critiques', icon: 'star' },
  { id: 'behind_scenes', name: 'Coulisses', icon: 'videocam' },
];

export default function MagazineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<any[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const fetchArticles = async () => {
    try {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const response = await articlesApi.getAll(params);
      setArticles(response.data);
      
      // Get featured articles
      const featuredRes = await articlesApi.getAll({ featured: true });
      setFeaturedArticles(featuredRes.data);
    } catch (error) {
      console.log('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchArticles();
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement du magazine..." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Ionicons name="newspaper" size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>Toom-Mag</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryPill,
              selectedCategory === cat.id && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={selectedCategory === cat.id ? Colors.white : Colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Featured Article */}
        {featuredArticles.length > 0 && selectedCategory === 'all' && (
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => router.push(`/article/${featuredArticles[0].id}`)}
          >
            <View style={styles.featuredImage}>
              {featuredArticles[0].cover_image ? (
                <Image source={{ uri: featuredArticles[0].cover_image }} style={styles.featuredImg} />
              ) : (
                <Ionicons name="document-text" size={60} color={Colors.primary} />
              )}
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color={Colors.gold} />
                <Text style={styles.featuredBadgeText}>À la une</Text>
              </View>
            </View>
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle}>{featuredArticles[0].title}</Text>
              {featuredArticles[0].subtitle && (
                <Text style={styles.featuredSubtitle}>{featuredArticles[0].subtitle}</Text>
              )}
              <View style={styles.featuredMeta}>
                <Text style={styles.featuredAuthor}>{featuredArticles[0].author}</Text>
                <View style={styles.viewsContainer}>
                  <Ionicons name="eye-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.viewsText}>{featuredArticles[0].views}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Articles List */}
        <View style={styles.articlesList}>
          {articles.filter(a => !a.featured || selectedCategory !== 'all').map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => router.push(`/article/${article.id}`)}
            >
              <View style={styles.articleImage}>
                {article.cover_image ? (
                  <Image source={{ uri: article.cover_image }} style={styles.articleImg} />
                ) : (
                  <Ionicons name="document-text" size={30} color={Colors.primary} />
                )}
              </View>
              <View style={styles.articleInfo}>
                <View style={styles.articleCategory}>
                  <Text style={styles.articleCategoryText}>
                    {CATEGORIES.find(c => c.id === article.category)?.name || article.category}
                  </Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                <View style={styles.articleMeta}>
                  <Text style={styles.articleAuthor}>{article.author}</Text>
                  <View style={styles.viewsContainer}>
                    <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.viewsText}>{article.views}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {articles.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={60} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucun article dans cette catégorie</Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold' },
  categoryScroll: { maxHeight: 50 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  categoryPillActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: Colors.white },
  scrollView: { flex: 1 },
  featuredCard: { backgroundColor: Colors.surface, margin: 16, borderRadius: 16, overflow: 'hidden' },
  featuredImage: { height: 180, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  featuredImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  featuredBadgeText: { color: Colors.gold, fontSize: 12, fontWeight: '600' },
  featuredInfo: { padding: 16 },
  featuredTitle: { color: Colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  featuredSubtitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: 12 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featuredAuthor: { color: Colors.textMuted, fontSize: 13 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: Colors.textMuted, fontSize: 12 },
  articlesList: { paddingHorizontal: 16 },
  articleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, borderRadius: 12, marginBottom: 12 },
  articleImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  articleImg: { width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover' },
  articleInfo: { flex: 1 },
  articleCategory: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  articleCategoryText: { color: Colors.white, fontSize: 10, fontWeight: '600' },
  articleTitle: { color: Colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  articleAuthor: { color: Colors.textMuted, fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 16, marginTop: 16 },
});
