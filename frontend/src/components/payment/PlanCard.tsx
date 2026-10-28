import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { formatPrice } from '../../utils/currency';
import type { SubscriptionPlan } from '../../types';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, currency, selected, onSelect }) => (
  <TouchableOpacity
    style={[
      styles.planCard,
      selected && styles.planCardSelected,
      plan.popular && styles.planCardPopular,
    ]}
    onPress={onSelect}
  >
    {plan.popular && (
      <View style={styles.popularBadge}>
        <Text style={styles.popularText}>POPULAIRE</Text>
      </View>
    )}

    <View style={styles.planHeader}>
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDuration}>{plan.duration_days} jours</Text>
      </View>
      <Text style={styles.planPrice}>
        {formatPrice(plan.prices[currency], currency)}
      </Text>
    </View>

    <View style={styles.planFeatures}>
      {plan.features?.map((feature, idx) => (
        <View key={idx} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
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
});
