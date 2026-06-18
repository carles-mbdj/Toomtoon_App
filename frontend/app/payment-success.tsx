import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkoutApi } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

export default function PaymentSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyPayment();
  }, [session_id]);

  const verifyPayment = async () => {
    if (!session_id) {
      setError("Session de paiement non trouvée");
      setLoading(false);
      return;
    }

    try {
      const response = await checkoutApi.getSessionStatus(session_id);
      const { status, payment_status } = response.data;

      if (status === 'complete' && payment_status === 'paid') {
        setVerified(true);
        // Refresh user data to get updated subscription
        await refreshUser();
      } else {
        setError("Le paiement n'a pas été complété");
      }
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      // Even if verification fails, the webhook will handle the subscription
      // So we can still show success
      setVerified(true);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Vérification du paiement...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={80} color={Colors.warning} />
          </View>
          <Text style={styles.title}>Vérification en cours</Text>
          <Text style={styles.message}>
            Votre paiement est en cours de traitement. Si votre abonnement n'apparaît pas immédiatement, veuillez patienter quelques minutes.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.primaryButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={100} color={Colors.success} />
        </View>
        
        <Text style={styles.title}>Paiement réussi !</Text>
        <Text style={styles.message}>
          Merci pour votre abonnement. Vous avez maintenant accès à tous les contenus premium de ToomToon.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark" size={20} color={Colors.success} />
            <Text style={styles.featureText}>Accès illimité aux webtoons</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark" size={20} color={Colors.success} />
            <Text style={styles.featureText}>Lecture hors-ligne</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark" size={20} color={Colors.success} />
            <Text style={styles.featureText}>Sans publicité</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.primaryButtonText}>Commencer à lire</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(tabs)/subscription')}
        >
          <Text style={styles.secondaryButtonText}>Voir mon abonnement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    color: Colors.text,
    fontSize: 16,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
