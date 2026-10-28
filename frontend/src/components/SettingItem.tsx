import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  rightComponent?: React.ReactNode;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  danger = false,
  rightComponent,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress && !rightComponent}
  >
    <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={22}
        color={danger ? Colors.error : Colors.primary}
      />
    </View>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
        {title}
      </Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightComponent || (showArrow && onPress && (
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    ))}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  settingTitleDanger: {
    color: Colors.error,
  },
  settingSubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
