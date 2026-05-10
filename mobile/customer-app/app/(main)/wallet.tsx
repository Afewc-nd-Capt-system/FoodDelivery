import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ArrowUp, ArrowDown, Wallet as WalletIcon, CreditCard, Send, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../shared/api';

export default function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
      ]);
      setBalance(balanceRes.data.balance || 0);
      setTransactions(transactionsRes.data.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <View style={styles.transactionCard}>
      <View style={[styles.iconContainer, item.type === 'credit' ? styles.iconCredit : styles.iconDebit]}>
        {item.type === 'credit' ? (
          <ArrowDown size={20} color="#16A34A" />
        ) : (
          <ArrowUp size={20} color="#E8621A" />
        )}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[styles.amountText, item.type === 'credit' ? styles.amountCredit : styles.amountDebit]}>
          {item.type === 'credit' ? '+' : '-'}₦{item.amount?.toLocaleString()}
        </Text>
        <Text style={styles.balanceText}>₦{item.balance?.toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#E8621A', '#C4501A']} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <CreditCard size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <History size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.transactionsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <WalletIcon size={48} color="#A0A0A0" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
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
  balanceCard: {
    margin: 24,
    padding: 32,
    borderRadius: 24,
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
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  transactionsSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    flexDirection: 'row',
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCredit: {
    backgroundColor: '#F0FDF4',
  },
  iconDebit: {
    backgroundColor: '#FFF1E8',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#636366',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  amountCredit: {
    color: '#16A34A',
  },
  amountDebit: {
    color: '#E8621A',
  },
  balanceText: {
    fontSize: 12,
    color: '#636366',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#636366',
    marginTop: 16,
  },
});
