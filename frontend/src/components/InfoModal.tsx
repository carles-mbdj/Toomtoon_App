import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface InfoModalProps {
  visible: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  onRequestClose: () => void;
}

/** Generic "single message + 1-2 buttons" dialog, used for things like
 * login-required or error prompts across the payment/subscription flows. */
export const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  icon,
  iconColor,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  onRequestClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Ionicons name={icon} size={secondaryLabel ? 48 : 64} color={iconColor} />
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          {secondaryLabel && onSecondaryPress && (
            <Pressable style={styles.modalButtonSecondary} onPress={onSecondaryPress}>
              <Text style={styles.modalButtonSecondaryText}>{secondaryLabel}</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.modalButtonPrimary, !secondaryLabel && styles.modalButtonFullWidth]}
            onPress={onPrimaryPress}
          >
            <Text style={styles.modalButtonPrimaryText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalButtonFullWidth: {
    width: '100%',
  },
  modalButtonPrimaryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
