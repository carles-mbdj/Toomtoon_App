import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { Header } from '../src/components/Header';
import { InfoModal } from '../src/components/InfoModal';
import { CurrencySelector } from '../src/components/payment/CurrencySelector';
import { PlanCard } from '../src/components/payment/PlanCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkoutApi } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { getErrorMessage } from '../src/utils/errors';
import { formatPrice } from '../src/utils/currency';
import { useSubscriptionPlans } from '../src/hooks/queries';
import Constants from 'expo-constants';

export default function PaymentScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();

  const [processing, setProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(planId || '');
  const [currency, setCurrency] = useState('EUR');

  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
      setAuthChecked(true);
    };
    verifyAuth();
  }, []);

  // Show the login modal once we know the user isn't authenticated;
  // plan fetching below is itself gated on being authenticated.
  useEffect(() => {
    if (!authChecked || authLoading) return;
    setShowLoginModal(!isAuthenticated);
  }, [authChecked, authLoading, isAuthenticated]);

  const plansQuery = useSubscriptionPlans({ enabled: authChecked && !authLoading && isAuthenticated });
  const plansData = plansQuery.data;
  const plans = plansData ?? [];
  const loading = !authChecked || authLoading || (isAuthenticated && plansQuery.isLoading);

  useEffect(() => {
    if (plansQuery.isError) {
      setErrorMessage('Impossible de charger les options de paiement');
      setShowErrorModal(true);
    }
  }, [plansQuery.isError]);

  // Default the selection to the requested plan, or the popular one, once plans load
  useEffect(() => {
    if (!plansData || plansData.length === 0 || selectedPlanId) return;
    if (planId && plansData.some((p) => p.id === planId)) {
      setSelectedPlanId(planId);
    } else {
      setSelectedPlanId((plansData.find((p) => p.popular) || plansData[0]).id);
    }
  }, [plansData, planId, selectedPlanId]);

  const plan = plans.find((p) => p.id === selectedPlanId) ?? null;

  // Handle payment - redirect to Stripe Checkout
  const handlePayment = async () => {
    if (!plan) {
      setErrorMessage('Veuillez sélectionner un plan');
      setShowErrorModal(true);
      return;
    }

    setProcessing(true);

    try {
      // Get base URL for success/cancel redirects
      const baseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
                      'https://african-webtoons.preview.emergentagent.com';

      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-cancel`;

      // Create Stripe Checkout session
      const response = await checkoutApi.createSession(
        selectedPlanId,
        currency,
        successUrl,
        cancelUrl
      );

      const { checkout_url } = response.data;

      // Open Stripe Checkout in browser
      if (Platform.OS === 'web') {
        window.location.href = checkout_url;
      } else {
        // For native apps, open in external browser
        const supported = await Linking.canOpenURL(checkout_url);
        if (supported) {
          await Linking.openURL(checkout_url);
        } else {
          setErrorMessage("Impossible d'ouvrir la page de paiement");
          setShowErrorModal(true);
        }
      }

    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage(getErrorMessage(error, 'Une erreur est survenue lors du paiement'));
      setShowErrorModal(true);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header showBack title="Paiement" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack title="Choisir un abonnement" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <CurrencySelector value={currency} onChange={setCurrency} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisissez votre plan</Text>
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              currency={currency}
              selected={selectedPlanId === p.id}
              onSelect={() => setSelectedPlanId(p.id)}
            />
          ))}
        </View>

        {/* Stripe Checkout Info */}
        <View style={styles.stripeInfo}>
          <View style={styles.stripeHeader}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.success} />
            <Text style={styles.stripeTitle}>Paiement sécurisé</Text>
          </View>
          <Text style={styles.stripeDesc}>
            Vous serez redirigé vers Stripe, notre partenaire de paiement sécurisé.
            Vos données bancaires ne transitent jamais par nos serveurs.
          </Text>
          <View style={styles.paymentMethods}>
            <View style={styles.methodBadge}>
              <Ionicons name="card" size={18} color={Colors.text} />
              <Text style={styles.methodText}>Carte bancaire</Text>
            </View>
          </View>
        </View>

        {/* Recurring subscription notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            Votre abonnement sera renouvelé automatiquement. Vous pouvez l'annuler à tout moment depuis votre espace abonnement.
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>
            {plan ? formatPrice(plan.prices[currency], currency) : '-'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing || !plan}
        >
          {processing ? (
            <>
              <ActivityIndicator color={Colors.white} size="small" />
              <Text style={styles.payButtonText}>Redirection vers Stripe...</Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color={Colors.white} />
              <Text style={styles.payButtonText}>S'abonner maintenant</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          En continuant, vous acceptez nos conditions générales d'utilisation
        </Text>
      </View>

      <InfoModal
        visible={showLoginModal}
        icon="person-circle"
        iconColor={Colors.primary}
        title="Connexion requise"
        message="Connectez-vous pour souscrire à un abonnement"
        secondaryLabel="Annuler"
        onSecondaryPress={() => router.back()}
        primaryLabel="Se connecter"
        onPrimaryPress={() => {
          setShowLoginModal(false);
          router.push('/auth');
        }}
        onRequestClose={() => router.back()}
      />

      <InfoModal
        visible={showErrorModal}
        icon="alert-circle"
        iconColor={Colors.error}
        title="Erreur"
        message={errorMessage}
        primaryLabel="OK"
        onPrimaryPress={() => setShowErrorModal(false)}
        onRequestClose={() => setShowErrorModal(false)}
      />
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textMuted,
    marginTop: 12,
    fontSize: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  stripeInfo: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  stripeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stripeTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  stripeDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  methodText: {
    color: Colors.text,
    fontSize: 14,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  noticeText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  totalPrice: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  termsText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
