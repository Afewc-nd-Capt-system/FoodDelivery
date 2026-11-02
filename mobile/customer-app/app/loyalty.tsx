import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { TrendingUp, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../shared/api';

export default function LoyaltyScreen() {
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState('Member');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  // Real loyalty data — GET /loyalty/balance and /loyalty/history (v2 API).
  useEffect(() => {
    Promise.all([api.get('/loyalty/balance'), api.get('/loyalty/history?limit=50')])
      .then(([balanceRes, historyRes]) => {
        setPoints(Number(balanceRes.data?.data?.points ?? 0));
        const items = historyRes.data?.data;
        if (Array.isArray(items)) setHistory(items);
      })
      .catch((error) => console.error('Failed to load loyalty data:', error))
      .finally(() => setLoading(false));
  }, []);

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
        <Gift size={20} color="#E8621A" />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDescription}>{item.description || 'Loyalty transaction'}</Text>
        <Text style={styles.historyDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
      </View>
      <Text style={[styles.historyPoints, { color: item.points < 0 ? '#D32F2F' : '#16A34A' }]}>
        {item.points < 0 ? '' : '+'}{item.points} pts
      </Text>
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
          <Text style={styles.tierText}>{tier}</Text>
        </View>
      </LinearGradient>

      <View style={styles.rewardsSection}>
        <Text style={styles.sectionTitle}>Redeem Rewards</Text>
        <Text style={styles.rewardNote}>
          Rewards redemption is coming to the app soon. Points earned on every order are tracked above in real time.
        </Text>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Points History</Text>
        {!loading && history.length === 0 ? (
          <Text style={styles.rewardNote}>No loyalty activity yet. Points appear after your first completed order.</Text>
        ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item._id || String(item.id)}
          scrollEnabled={false}
          contentContainerStyle={styles.historyList}
        />
        )}
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
  rewardNote: {
    fontSize: 14,
    color: '#636366',
    lineHeight: 20,
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
