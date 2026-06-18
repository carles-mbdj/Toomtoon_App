import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { articlesApi, commentsApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  
  const [article, setArticle] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const [articleRes, commentsRes] = await Promise.all([
        articlesApi.getById(id as string),
        commentsApi.get({ article_id: id as string }),
      ]);
      setArticle(articleRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour commenter', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await commentsApi.create({
        article_id: id as string,
        content: newComment.trim(),
      });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour aimer');
      return;
    }
    try {
      const response = await commentsApi.like(commentId);
      setComments(comments.map(c => 
        c.id === commentId ? { ...c, likes: response.data.likes } : c
      ));
    } catch (error) {
      console.log('Error liking:', error);
    }
  };

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
          <Image source={{ uri: article.cover_image }} style={styles.coverImage} />
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
          <Text style={styles.articleContent}>{article.content}</Text>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Commentaires ({comments.length})
            </Text>

            {/* Add Comment */}
            <View style={styles.addComment}>
              <TextInput
                style={styles.commentInput}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor={Colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? (
                  <LoadingSpinner />
                ) : (
                  <Ionicons name="send" size={20} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment.username?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>{comment.username}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => handleLikeComment(comment.id)}
                  >
                    <Ionicons name="heart-outline" size={16} color={Colors.primary} />
                    <Text style={styles.likeCount}>{comment.likes}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {comments.length === 0 && (
              <Text style={styles.noComments}>Aucun commentaire. Soyez le premier!</Text>
            )}
          </View>
        </View>

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
  coverImage: { width: '100%', height: 250, resizeMode: 'cover' },
  content: { padding: 16, paddingTop: 100 },
  categoryBadge: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  categoryText: { color: Colors.white, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { color: Colors.text, fontSize: 26, fontWeight: 'bold', marginBottom: 8, lineHeight: 32 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, marginBottom: 16, lineHeight: 24 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  author: { color: Colors.textMuted, fontSize: 14 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  views: { color: Colors.textMuted, fontSize: 14 },
  articleContent: { color: Colors.text, fontSize: 16, lineHeight: 26 },
  commentsSection: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  commentsTitle: { color: Colors.text, fontSize: 18, fontWeight: '600', marginBottom: 16 },
  addComment: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 20 },
  commentInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, color: Colors.text, fontSize: 14, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.surfaceLight },
  commentCard: { flexDirection: 'row', marginBottom: 16 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  commentAvatarText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  commentContent: { flex: 1, backgroundColor: Colors.surface, padding: 12, borderRadius: 12 },
  commentAuthor: { color: Colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  commentText: { color: Colors.textSecondary, fontSize: 14, marginBottom: 8 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: { color: Colors.primary, fontSize: 12 },
  noComments: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 16, marginTop: 16 },
});
