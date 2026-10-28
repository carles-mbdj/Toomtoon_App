import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

const CURRENCY_OPTIONS = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA' },
];

interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ value, onChange }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Devise</Text>
    <View style={styles.currencyRow}>
      {CURRENCY_OPTIONS.map((cur) => (
        <TouchableOpacity
          key={cur.code}
          style={[styles.currencyButton, value === cur.code && styles.currencyButtonActive]}
          onPress={() => onChange(cur.code)}
        >
          <Text style={[styles.currencyText, value === cur.code && styles.currencyTextActive]}>
            {cur.symbol}
          </Text>
          <Text style={[styles.currencyName, value === cur.code && styles.currencyNameActive]}>
            {cur.code}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
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
});
