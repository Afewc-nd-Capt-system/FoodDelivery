import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Crown, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../shared/api';

export default function VibePassScreen() {
  const [plans, setPlans] = useState([
    {
      id: '1',
      name: 'Basic',
      price: 1000,
      features: ['Free delivery on orders over ₦2000', '5% discount on all orders', 'Priority support'],
      badge: null,
    },
    {
      id: '2',
      name: 'Premium',
      price: 3000,
      features: ['Free delivery on all orders', '10% discount on all orders', 'Exclusive deals', 'Priority support', 'Early access to new features'],
      badge: 'POPULAR',
    },
    {
      id: '3',
      name: 'VIP',
      price: 5000,
      features: ['Free delivery on all orders', '15% discount on all orders', 'Exclusive deals', 'Priority support', 'Early access to new features', 'Free meal every month'],
      badge: 'BEST VALUE',
    },
  ]);
  const [currentPlan, setCurrentPlan] = useState('1');

  const handleSubscribe = async (planId: string) => {
    // TODO: Implement Paystack subscription
    router.push('/checkout');
  };

  const renderPlan = ({ item, index }: { item: typeof plans[0]; index: number }) => {
    const isCurrent = currentPlan === item.id;
    const isPopular = index === 1;
    const isBestValue = index === 2;

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isBestValue && styles.planCardBest,
        ]}
        onPress={() => !isCurrent && handleSubscribe(item.id)}
      >
        {item.badge && (
          <View style={[styles.badge, isBestValue ? styles.badgeGreen : styles.badgeOrange]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <Text style={styles.planName}>{item.name}</Text>
        <Text style={styles.planPrice}>₦{item.price.toLocaleString()}/mo</Text>
        <View style={styles.featuresList}>
          {item.features.map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Check size={16} color="#16A34A" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            isCurrent && styles.subscribeButtonDisabled,
            isBestValue && styles.subscribeButtonBest,
          ]}
          disabled={isCurrent}
        >
          <Text style={styles.subscribeButtonText}>
            {isCurrent ? 'Current Plan' : 'Subscribe'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VibePass</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.introSection}>
        <Crown size={48} color="#E8621A" style={styles.crownIcon} />
        <Text style={styles.introTitle}>Unlock Exclusive Benefits</Text>
        <Text style={styles.introDescription}>
          Subscribe to VibePass and enjoy free delivery, exclusive discounts, and more!
        </Text>
      </View>

      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.plansContainer}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
  },
  backText: {
    fontSize: 16,
    color: '#E8621A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  introSection: {
    padding: 24,
    alignItems: 'center',
  },
  crownIcon: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  introDescription: {
    fontSize: 14,
    color: '#636366',
    textAlign: 'center',
  },
  plansContainer: {
    padding: 24,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  planCardBest: {
    backgroundColor: 'linear-gradient(135deg, #E8621A, #C4501A)',
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOrange: {
    backgroundColor: '#E8621A',
  },
  badgeGreen: {
    backgroundColor: '#16A34A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#E8621A',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#636366',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#E8621A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#E8E8E8',
  },
  subscribeButtonBest: {
    backgroundColor: '#FFFFFF',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
