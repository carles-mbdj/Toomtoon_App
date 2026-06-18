import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { Header } from '../src/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkoutApi, subscriptionApi } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import Constants from 'expo-constants';

// Currency formatting
const formatPrice = (amount: number, currency: string): string => {
  if (currency === 'XAF') {
    return `${amount.toLocaleString('fr-FR')} XAF`;
  }
  return `${(amount / 100).toFixed(2)} ${currency}`;
};

// Currency symbols
const CURRENCY_OPTIONS = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA' },
];

export default function PaymentScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, refreshUser, isLoading: authLoading, checkAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
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

  // Handle auth state
  useEffect(() => {
    if (!authChecked || authLoading) return;
    
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
      fetchData();
    }
  }, [authChecked, authLoading, isAuthenticated]);

  useEffect(() => {
    if (plans.length > 0 && selectedPlanId) {
      const found = plans.find(p => p.id === selectedPlanId);
      setPlan(found);
    }
  }, [selectedPlanId, plans]);

  const fetchData = async () => {
    try {
      const plansRes = await subscriptionApi.getPlans();
      setPlans(plansRes.data);
      
      if (planId) {
        setSelectedPlanId(planId);
        const found = plansRes.data.find((p: any) => p.id === planId);
        setPlan(found);
      } else if (plansRes.data.length > 0) {
        const popularPlan = plansRes.data.find((p: any) => p.popular) || plansRes.data[0];
        setSelectedPlanId(popularPlan.id);
        setPlan(popularPlan);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      setErrorMessage('Impossible de charger les options de paiement');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

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
      
      const { checkout_url, session_id } = response.data;
      
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
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.response?.data?.detail || 'Une erreur est survenue lors du paiement');
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
        {/* Currency Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devise</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_OPTIONS.map((cur) => (
              <TouchableOpacity
                key={cur.code}
                style={[
                  styles.currencyButton,
                  currency === cur.code && styles.currencyButtonActive,
                ]}
                onPress={() => setCurrency(cur.code)}
              >
                <Text style={[
                  styles.currencyText,
                  currency === cur.code && styles.currencyTextActive,
                ]}>
                  {cur.symbol}
                </Text>
                <Text style={[
                  styles.currencyName,
                  currency === cur.code && styles.currencyNameActive,
                ]}>
                  {cur.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisissez votre plan</Text>
          
          {plans.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.planCard,
                selectedPlanId === p.id && styles.planCardSelected,
                p.popular && styles.planCardPopular,
              ]}
              onPress={() => {
                setSelectedPlanId(p.id);
                setPlan(p);
              }}
            >
              {p.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAIRE</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View style={styles.radioOuter}>
                  {selectedPlanId === p.id && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planDuration}>{p.duration_days} jours</Text>
                </View>
                <Text style={styles.planPrice}>
                  {formatPrice(p.prices[currency], currency)}
                </Text>
              </View>
              
              <View style={styles.planFeatures}>
                {p.features?.map((feature: string, idx: number) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
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

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() => router.back()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="person-circle" size={48} color={Colors.primary} />
            <Text style={styles.modalTitle}>Connexion requise</Text>
            <Text style={styles.modalMessage}>
              Connectez-vous pour souscrire à un abonnement
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonSecondary}
                onPress={() => router.back()}
              >
                <Text style={styles.modalButtonSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push('/auth');
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>Se connecter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={64} color={Colors.error} />
            <Text style={styles.modalTitle}>Erreur</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <Pressable
              style={[styles.modalButtonPrimary, { width: '100%', marginTop: 20 }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonPrimaryText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencyButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  currencyText: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: 'bold',
  },
  currencyTextActive: {
    color: Colors.primary,
  },
  currencyName: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  currencyNameActive: {
    color: Colors.text,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  planCardPopular: {
    borderColor: Colors.warning,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  planDuration: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  planPrice: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  planFeatures: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: 14,
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
  // Modal styles
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
  modalButtonPrimaryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
