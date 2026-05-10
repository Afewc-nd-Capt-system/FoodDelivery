import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { TrendingUp, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../shared/api';

export default function LoyaltyScreen() {
  const [points, setPoints] = useState(1250);
  const [tier, setTier] = useState('Gold');
  const [history, setHistory] = useState([
    { id: '1', description: 'Order #12345', points: 50, date: '2024-01-15' },
    { id: '2', description: 'Order #12344', points: 45, date: '2024-01-14' },
    { id: '3', description: 'Referral bonus', points: 100, date: '2024-01-10' },
  ]);

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
        <Gift size={20} color="#E8621A" />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDescription}>{item.description}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
      <Text style={styles.historyPoints}>+{item.points} pts</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loyalty Points</Text>
        <View style={{ width: 40 }} />
      </View>

      <LinearGradient colors={['#E8621A', '#C4501A']} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Points</Text>
        <Text style={styles.balanceAmount}>{points.toLocaleString()}</Text>
        <View style={styles.tierBadge}>
          <TrendingUp size={16} color="#FFFFFF" />
          <Text style={styles.tierText}>{tier} Tier</Text>
        </View>
      </LinearGradient>

      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Progress to Platinum</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '65%' }]} />
        </View>
        <Text style={styles.progressText}>2,500 / 5,000 points</Text>
      </View>

      <View style={styles.rewardsSection}>
        <Text style={styles.sectionTitle}>Redeem Rewards</Text>
        <View style={styles.rewardsList}>
          <TouchableOpacity style={styles.rewardCard}>
            <Text style={styles.rewardEmoji}>🎁</Text>
            <Text style={styles.rewardPoints}>500 pts</Text>
            <Text style={styles.rewardTitle}>Free Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rewardCard}>
            <Text style={styles.rewardEmoji}>🍔</Text>
            <Text style={styles.rewardPoints}>1000 pts</Text>
            <Text style={styles.rewardTitle}>Free Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rewardCard}>
            <Text style={styles.rewardEmoji}>💰</Text>
            <Text style={styles.rewardPoints}>2000 pts</Text>
            <Text style={styles.rewardTitle}>₦500 Credit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Points History</Text>
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.historyList}
        />
      </View>
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
  balanceCard: {
    margin: 24,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E8621A',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#636366',
  },
  rewardsSection: {
    padding: 24,
  },
  rewardsList: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  rewardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E8621A',
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 12,
    color: '#636366',
    textAlign: 'center',
  },
  historySection: {
    padding: 24,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#636366',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
});
