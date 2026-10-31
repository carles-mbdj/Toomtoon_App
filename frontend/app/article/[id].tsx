import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { CommentsSection } from '../../src/components/comments/CommentsSection';
import { HtmlContent } from '../../src/components/HtmlContent';
import { useArticle } from '../../src/hooks/queries';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams();
  const articleId = id as string;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const articleQuery = useArticle(articleId);
  const article = articleQuery.data ?? null;
  const loading = articleQuery.isLoading;

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement de l'article..." />;
  }

  if (!article) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={60} color={Colors.error} />
          <Text style={styles.errorText}>Article non trouvé</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        {article.cover_image && (
          <Image
            source={{ uri: article.cover_image }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
          />
        )}

        <View style={styles.content}>
          {/* Category */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>
          {article.subtitle && (
            <Text style={styles.subtitle}>{article.subtitle}</Text>
          )}

          {/* Meta */}
          <View style={styles.meta}>
            <Text style={styles.author}>Par {article.author}</Text>
            <View style={styles.viewsContainer}>
              <Ionicons name="eye-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.views}>{article.views} vues</Text>
            </View>
          </View>

          {/* Content */}
          <HtmlContent html={article.content} />
        </View>

        <CommentsSection articleId={articleId} />

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(26, 10, 13, 0.9)' },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  shareButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  coverImage: { width: '100%', height: 250 },
  content: { padding: 16, paddingTop: 100 },
  categoryBadge: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  categoryText: { color: Colors.white, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { color: Colors.text, fontSize: 26, fontWeight: 'bold', marginBottom: 8, lineHeight: 32 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, marginBottom: 16, lineHeight: 24 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  author: { color: Colors.textMuted, fontSize: 14 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  views: { color: Colors.textMuted, fontSize: 14 },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 16, marginTop: 16 },
});
