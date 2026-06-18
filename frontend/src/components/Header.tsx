import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  showBack?: boolean;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showLogo = true,
  showSearch = true,
  showSettings = true,
  showBack = false,
  onSearchPress,
  onSettingsPress,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
        {showLogo && (
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>T</Text>
            </View>
            <Text style={styles.logoText}>ToomToon</Text>
          </View>
        )}
        {title && !showLogo && (
          <Text style={styles.title}>{title}</Text>
        )}
      </View>
      <View style={styles.right}>
        {showSearch && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onSearchPress || (() => router.push('/search'))}
          >
            <Ionicons name="search" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
        {showSettings && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onSettingsPress || (() => router.push('/settings'))}
          >
            <Ionicons name="menu" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIconText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
