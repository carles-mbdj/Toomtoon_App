import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useComments, useCreateComment, useDislikeComment, useLikeComment } from '../../hooks/queries';
import { LoadingSpinner } from '../LoadingSpinner';

interface CommentsSectionProps {
  webtoonId?: string;
  episodeId?: string;
  articleId?: string;
  /** If set, only this many comments show by default behind a "show more" button. */
  previewCount?: number;
}

/** Self-contained comment thread (list + add + like), shared between the
 * webtoon detail screen and the article detail screen. */
export const CommentsSection: React.FC<CommentsSectionProps> = ({
  webtoonId,
  episodeId,
  articleId,
  previewCount,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [showAll, setShowAll] = useState(!previewCount);

  const params = { webtoon_id: webtoonId, episode_id: episodeId, article_id: articleId };
  const commentsQuery = useComments(params);
  const createComment = useCreateComment(params);
  const likeComment = useLikeComment(params);
  const dislikeComment = useDislikeComment(params);
  const comments = commentsQuery.data ?? [];
  const displayedComments = previewCount && !showAll ? comments.slice(0, previewCount) : comments;

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour commenter', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync(newComment.trim());
      setNewComment('');
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ajouter le commentaire");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour aimer');
      return;
    }
    try {
      await likeComment.mutateAsync(commentId);
    } catch (error) {
      console.log('Error liking:', error);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour réagir');
      return;
    }
    try {
      await dislikeComment.mutateAsync(commentId);
    } catch (error) {
      console.log('Error disliking:', error);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Commentaires ({comments.length})</Text>

      <View style={styles.addComment}>
        <TextInput
          style={styles.commentInput}
          placeholder="Ajouter un commentaire..."
          placeholderTextColor={Colors.textMuted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newComment.trim() || createComment.isPending) && styles.sendButtonDisabled]}
          onPress={handleAddComment}
          disabled={!newComment.trim() || createComment.isPending}
        >
          {createComment.isPending ? (
            <LoadingSpinner />
          ) : (
            <Ionicons name="send" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {displayedComments.map((comment) => (
        <View key={comment.id} style={styles.commentCard}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>
              {comment.username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{comment.username}</Text>
              <Text style={styles.commentDate}>
                {comment.created_at ? new Date(comment.created_at).toLocaleDateString('fr-FR') : ''}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.content}</Text>
            <View style={styles.reactionsRow}>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleLikeComment(comment.id)}
              >
                <Ionicons
                  name={comment.liked_by_user ? 'heart' : 'heart-outline'}
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.likeCount}>{comment.likes || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleDislikeComment(comment.id)}
              >
                <Ionicons
                  name={comment.disliked_by_user ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={16}
                  color={Colors.textMuted}
                />
                <Text style={styles.dislikeCount}>{comment.dislikes || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {previewCount && comments.length > previewCount && !showAll && (
        <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAll(true)}>
          <Text style={styles.showMoreText}>Voir tous les commentaires ({comments.length})</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {comments.length === 0 && (
        <View style={styles.noComments}>
          <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.noCommentsText}>Aucun commentaire</Text>
          <Text style={styles.noCommentsHint}>Soyez le premier à donner votre avis !</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  addComment: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 80,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  commentCard: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  commentDate: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  commentText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    color: Colors.primary,
    fontSize: 12,
  },
  dislikeCount: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  showMoreText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noCommentsText: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 12,
  },
  noCommentsHint: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
