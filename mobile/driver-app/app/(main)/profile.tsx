import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { User, Star, Bike, Shield, Settings, LogOut, FileText, Camera, Lock } from 'lucide-react-native';
import { api } from '../../../shared/api';

const menuItems = [
  { icon: Bike, label: 'Vehicle Info', route: '/vehicle' },
  { icon: FileText, label: 'Documents', route: '/documents' },
  { icon: Camera, label: 'Verification', route: '/verification' },
  { icon: Settings, label: 'Settings', route: '/settings' },
  { icon: Lock, label: 'Change Password', route: '/password' },
  { icon: Shield, label: 'Privacy & Security', route: '/privacy' },
  { icon: User, label: 'Help & Support', route: '/help' },
];

export default function DriverProfileScreen() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('jwt_token');
          await SecureStore.deleteItemAsync('user_id');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const renderMenuItem = ({ item }: { item: typeof menuItems[0] }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => router.push(item.route)}
    >
      <View style={styles.menuIcon}>
        <item.icon size={20} color="#E8621A" />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Driver'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Star size={14} color="#E8621A" />
            <Text style={styles.statText}>{user?.rating || '4.8'}</Text>
          </View>
          <View style={styles.statBadge}>
            <Bike size={14} color="#E8621A" />
            <Text style={styles.statText}>{user?.totalDeliveries || '156'} deliveries</Text>
          </View>
        </View>
      </View>

      <View style={styles.verificationSection}>
        <View style={[styles.verificationBadge, user?.isVerified ? styles.verified : styles.pending]}>
          <Shield size={20} color={user?.isVerified ? '#16A34A' : '#F57C00'} />
          <Text style={styles.verificationText}>
            {user?.isVerified ? 'Verified' : 'Verification Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.label}
          scrollEnabled={false}
          contentContainerStyle={styles.menuList}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#D32F2F" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>VibeChops Driver v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8621A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#636366',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  verificationSection: {
    padding: 24,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  verified: {
    backgroundColor: '#F0FDF4',
  },
  pending: {
    backgroundColor: '#FFF8E1',
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuSection: {
    padding: 24,
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginLeft: 12,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 24,
  },
});
