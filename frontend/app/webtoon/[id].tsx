import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/Header';
import { EpisodeItem } from '../../src/components/EpisodeItem';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { webtoonsApi, episodesApi, commentsApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WebtoonDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  
  const [webtoon, setWebtoon] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [webtoonRes, episodesRes, commentsRes] = await Promise.all([
        webtoonsApi.getById(id as string),
        episodesApi.getByWebtoon(id as string),
        commentsApi.get({ webtoon_id: id as string }),
      ]);
      setWebtoon(webtoonRes.data);
      setEpisodes(episodesRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      console.log('Error fetching webtoon:', error);
      Alert.alert('Erreur', 'Impossible de charger le webtoon');
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodePress = (episode: any) => {
    // Check if webtoon is ongoing and episode is not free
    if (webtoon?.status === 'ongoing' && !episode.is_free) {
      if (!isAuthenticated) {
        Alert.alert(
          'Connexion requise',
          'Connectez-vous pour accéder aux épisodes premium',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => router.push('/auth') },
          ]
        );
        return;
      }
      if (!user?.subscription_type) {
        Alert.alert(
          'Abonnement requis',
          'Ce webtoon est en cours de publication. Abonnez-vous pour accéder aux épisodes premium.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: "S'abonner", onPress: () => router.push('/(tabs)/subscription') },
          ]
        );
        return;
      }
    }
    
    // Regular premium check for completed webtoons
    if (!episode.is_free) {
      if (!isAuthenticated) {
        Alert.alert(
          'Connexion requise',
          'Connectez-vous pour accéder à cet épisode',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => router.push('/auth') },
          ]
        );
        return;
      }
      if (!user?.subscription_type) {
        Alert.alert(
          'Abonnement requis',
          'Abonnez-vous pour accéder à tous les épisodes',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: "S'abonner", onPress: () => router.push('/(tabs)/subscription') },
          ]
        );
        return;
      }
    }
    router.push(`/reader/${episode.id}`);
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
        webtoon_id: id as string,
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
    return <LoadingSpinner fullScreen text="Chargement..." />;
  }

  if (!webtoon) {
    return (
      <View style={styles.container}>
        <Header showBack showLogo={false} title="Erreur" />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={60} color={Colors.error} />
          <Text style={styles.errorText}>Webtoon non trouvé</Text>
        </View>
      </View>
    );
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header showBack showLogo={false} title={webtoon.title} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.coverImage}>
            {webtoon.cover_image ? (
              <Image source={{ uri: webtoon.cover_image }} style={styles.coverImg} />
            ) : (
              <Ionicons name="book" size={60} color={Colors.primary} />
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.title}>{webtoon.title}</Text>
            <Text style={styles.author}>par {webtoon.author}</Text>
            <View style={styles.metaRow}>
              <View style={styles.genreBadge}>
                <Text style={styles.genreText}>{webtoon.genre}</Text>
              </View>
              {webtoon.status === 'ongoing' ? (
                <View style={styles.ongoingBadge}>
                  <Text style={styles.ongoingText}>En cours</Text>
                </View>
              ) : (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>Terminé</Text>
                </View>
              )}
              <Text style={styles.season}>Saison {webtoon.season}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="eye" size={16} color={Colors.textMuted} />
                <Text style={styles.statText}>{(webtoon.views / 1000).toFixed(1)}k vues</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="layers" size={16} color={Colors.textMuted} />
                <Text style={styles.statText}>{webtoon.total_episodes} épisodes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.description}>{webtoon.description}</Text>
        </View>

        {/* Episodes List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Épisodes</Text>
            <View style={styles.freeInfo}>
              <Ionicons name="gift" size={14} color={Colors.success} />
              <Text style={styles.freeInfoText}>4 premiers gratuits</Text>
            </View>
          </View>
          
          <View style={styles.episodesList}>
            {episodes.map((episode) => (
              <EpisodeItem
                key={episode.id}
                number={episode.number}
                title={episode.title}
                is_free={episode.is_free}
                views={episode.views}
                onPress={() => handleEpisodePress(episode)}
              />
            ))}
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Commentaires ({comments.length})</Text>
          </View>

          {/* Add Comment */}
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
              style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <LoadingSpinner />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>

          {/* Comments List */}
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
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleLikeComment(comment.id)}
                >
                  <Ionicons name="heart-outline" size={16} color={Colors.primary} />
                  <Text style={styles.likeCount}>{comment.likes || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {comments.length > 3 && !showAllComments && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllComments(true)}
            >
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

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  hero: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  genreBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  ongoingBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ongoingText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  season: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
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
    marginBottom: 12,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
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
  episodesList: {
    gap: 0,
  },
  // Comments styles
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
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    color: Colors.primary,
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
