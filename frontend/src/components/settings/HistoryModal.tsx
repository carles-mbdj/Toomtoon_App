import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { historyApi } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import type { HistoryEntry } from '../../types';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await historyApi.get();
      setHistory(response.data);
    } catch (error) {
      console.log('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      "Effacer l'historique",
      "Voulez-vous vraiment effacer tout l'historique de lecture?",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await historyApi.clear();
              setHistory([]);
              Alert.alert('Succès', 'Historique effacé');
            } catch (error) {
              Alert.alert('Erreur', "Impossible d'effacer l'historique");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historique de lecture</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <LoadingSpinner text="Chargement..." />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={50} color={Colors.textMuted} />
              <Text style={styles.emptyHistoryText}>Aucun historique</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyItem}
                  onPress={() => {
                    onClose();
                    router.push(`/webtoon/${item.webtoon_id}`);
                  }}
                >
                  <View style={styles.historyImage}>
                    <Ionicons name="book" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.webtoon_title}</Text>
                    <Text style={styles.historyEpisode}>
                      Épisode {item.episode_number} • Page {item.last_page + 1}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.clearHistoryButton} onPress={clearHistory}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={styles.clearHistoryText}>Effacer l'historique</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginTop: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  historyEpisode: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 10,
    gap: 8,
  },
  clearHistoryText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
