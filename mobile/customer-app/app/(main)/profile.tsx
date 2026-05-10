import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Package, TrendingUp, Heart, Ticket, Calendar, Utensils, MessageSquare, Shield, HelpCircle, LogOut, User } from 'lucide-react-native';
import { api } from '../../../shared/api';

const menuItems = [
  { icon: Package, label: 'My Orders', route: '/orders' },
  { icon: TrendingUp, label: 'Loyalty Points', route: '/loyalty' },
  { icon: Ticket, label: 'Referral', route: '/referral' },
  { icon: Heart, label: 'Saved Restaurants', route: '/favorites' },
  { icon: Utensils, label: 'Dietary Preferences', route: '/dietary' },
  { icon: Calendar, label: 'Reservations', route: '/reservations' },
  { icon: MessageSquare, label: 'Notifications', route: '/notifications' },
  { icon: Shield, label: 'Privacy & Security', route: '/privacy' },
  { icon: HelpCircle, label: 'Help & Support', route: '/help' },
];

export default function ProfileScreen() {
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
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <Text style={styles.userPhone}>{user?.phone || ''}</Text>
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

      <Text style={styles.version}>VibeChops v1.0.0</Text>
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
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#636366',
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
