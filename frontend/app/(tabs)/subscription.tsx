import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/Header';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { subscriptionApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSelectPlanModal, setShowSelectPlanModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionApi.getPlans();
      // Handle both array format (new) and object format (old)
      const plansData = Array.isArray(response.data) ? response.data : Object.entries(response.data).map(([key, value]: [string, any]) => ({
        id: key,
        name: value.label || key,
        duration_days: value.days || 30,
        prices: { EUR: value.price * 100 },
        features: ['Accès illimité', 'Sans publicité'],
        popular: key === '3_months',
      }));
      setPlans(plansData);
      
      // Auto-select popular plan
      const popularPlan = plansData.find((p: any) => p.popular);
      if (popularPlan) {
        setSelectedPlan(popularPlan.id);
      }
    } catch (error) {
      console.log('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (!selectedPlan) {
      setShowSelectPlanModal(true);
      return;
    }

    // Navigate to payment screen with selected plan
    router.push(`/payment?planId=${selectedPlan}`);
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement des offres..." />;
  }

  const hasActiveSubscription = user?.subscription_type && user?.subscription_end;
  const subscriptionEndDate = user?.subscription_end ? new Date(user.subscription_end) : null;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.keyIcon}>
            <Ionicons name="key" size={40} color={Colors.gold} />
          </View>
          <Text style={styles.title}>ToomToon Premium</Text>
          <Text style={styles.subtitle}>
            De nouveaux épisodes tous les 3 jours en Illimité
          </Text>
        </View>

        {/* Current Subscription Status */}
        {hasActiveSubscription && (
          <View style={styles.statusCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Abonnement Actif</Text>
              <Text style={styles.statusText}>
                Plan: {user.subscription_type}
              </Text>
              {subscriptionEndDate && (
                <Text style={styles.statusText}>
                  Expire le: {subscriptionEndDate.toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Benefits */}
        <View style={styles.benefits}>
          <View style={styles.benefit}>
            <Ionicons name="infinite" size={24} color={Colors.primary} />
            <Text style={styles.benefitText}>Accès illimité à tous les épisodes</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="flash" size={24} color={Colors.primary} />
            <Text style={styles.benefitText}>Nouveaux épisodes en avant-première</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="download" size={24} color={Colors.primary} />
            <Text style={styles.benefitText}>Téléchargement hors-ligne</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="close-circle" size={24} color={Colors.primary} />
            <Text style={styles.benefitText}>Sans publicités</Text>
          </View>
        </View>

        {/* Plans */}
        <Text style={styles.plansTitle}>Choisissez votre plan</Text>
        <View style={styles.plansContainer}>
          {plans.map((plan: any) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.popular && styles.planCardBest,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>POPULAIRE</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Ionicons
                  name={plan.duration_days >= 365 ? 'star' : plan.duration_days >= 90 ? 'calendar' : 'calendar-outline'}
                  size={28}
                  color={selectedPlan === plan.id ? Colors.primary : Colors.textSecondary}
                />
                <Text style={styles.planLabel}>{plan.name}</Text>
              </View>
              <Text style={styles.planPrice}>
                {plan.prices?.EUR ? `${(plan.prices.EUR / 100).toFixed(0)}€` : `${plan.price || 0}€`}
              </Text>
              <Text style={styles.planPriceDetail}>
                {plan.duration_days} jours
              </Text>
              {selectedPlan === plan.id && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentTitle}>Paiement sécurisé par Stripe</Text>
          <View style={styles.paymentIcons}>
            <View style={styles.paymentIcon}>
              <Ionicons name="card" size={20} color={Colors.textSecondary} />
              <Text style={styles.paymentText}>Carte</Text>
            </View>
            <View style={styles.paymentIcon}>
              <Ionicons name="logo-apple" size={20} color={Colors.textSecondary} />
              <Text style={styles.paymentText}>Apple Pay</Text>
            </View>
            <View style={styles.paymentIcon}>
              <Ionicons name="logo-google" size={20} color={Colors.textSecondary} />
              <Text style={styles.paymentText}>Google Pay</Text>
            </View>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
          <Text style={styles.securityText}>
            Vos données sont protégées par chiffrement SSL
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            !selectedPlan && styles.subscribeButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedPlan}
        >
          <Ionicons name="card" size={24} color={Colors.white} />
          <Text style={styles.subscribeButtonText}>
            {hasActiveSubscription ? 'Prolonger mon abonnement' : 'Continuer vers le paiement'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="person-circle" size={48} color={Colors.primary} />
            <Text style={styles.modalTitle}>Connexion requise</Text>
            <Text style={styles.modalMessage}>
              Veuillez vous connecter pour vous abonner
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push('/auth');
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Select Plan Modal */}
      <Modal
        visible={showSelectPlanModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelectPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={48} color={Colors.warning} />
            <Text style={styles.modalTitle}>Sélectionnez un plan</Text>
            <Text style={styles.modalMessage}>
              Veuillez choisir un plan d'abonnement
            </Text>
            <TouchableOpacity
              style={[styles.modalButtonPrimary, { width: '100%', marginTop: 20 }]}
              onPress={() => setShowSelectPlanModal(false)}
            >
              <Text style={styles.modalButtonPrimaryText}>OK</Text>
            </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    padding: 24,
  },
  keyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  statusInfo: {
    marginLeft: 12,
  },
  statusTitle: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  benefits: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    color: Colors.text,
    fontSize: 14,
  },
  plansTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  planCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardBest: {
    backgroundColor: Colors.surfaceLight,
  },
  bestBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestBadgeText: {
    color: Colors.black,
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  planLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  planPrice: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  planPriceDetail: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  checkIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginHorizontal: 16,
  },
  securityText: {
    color: Colors.textMuted,
    fontSize: 12,
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
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  subscribeButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  subscribeButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  paymentMethods: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  paymentTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  paymentIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  paymentIcon: {
    alignItems: 'center',
    gap: 4,
  },
  paymentText: {
    color: Colors.textMuted,
    fontSize: 11,
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
