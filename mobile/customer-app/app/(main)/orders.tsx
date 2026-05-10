import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../shared/api';

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      const response = await api.get(`/orders?status=${activeTab}`);
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderImage}>
          <Text style={styles.imagePlaceholder}>🍽️</Text>
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.restaurantName}>{item.restaurant?.name || 'Restaurant'}</Text>
          <Text style={styles.orderStatus}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.orderItems}>{item.items?.slice(0, 2).map((i: any) => i.name).join(', ')}...</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>₦{item.totalAmount?.toLocaleString()}</Text>
        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {activeTab === 'active' && (
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => router.push(`/tracking/${item._id}`)}
        >
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['active', 'completed', 'cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.ordersContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 24,
    paddingTop: 50,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#E8621A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  ordersContainer: {
    padding: 24,
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  orderImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0EAE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    fontSize: 24,
  },
  orderInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 12,
    color: '#E8621A',
    fontWeight: '600',
  },
  orderItems: {
    fontSize: 14,
    color: '#636366',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  orderDate: {
    fontSize: 12,
    color: '#636366',
  },
  trackButton: {
    backgroundColor: '#E8621A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#636366',
  },
});
