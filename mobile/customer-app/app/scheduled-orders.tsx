import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Clock, Plus } from 'lucide-react-native';
import { api } from '../../shared/api';

export default function ScheduledOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);

  // Real scheduled orders — GET /scheduled-orders (v2 API).
  useEffect(() => {
    api.get('/scheduled-orders?limit=50')
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) setOrders(data);
      })
      .catch((error) => console.error('Failed to load scheduled orders:', error));
  }, []);

  const restaurantLabel = (item: any) =>
    typeof item.restaurant === 'object' ? item.restaurant?.name || item.restaurantName || 'Restaurant' : item.restaurantName || 'Restaurant';

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.restaurantName}>{restaurantLabel(item)}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>📅 {item.scheduledTime ? new Date(item.scheduledTime).toLocaleString() : ''}</Text>
        <Text style={styles.total}>₦{Number(item.totalAmount || 0).toLocaleString()}</Text>
      </View>
      {(item.status !== 'cancelled') && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            api.put(`/scheduled-orders/${item._id}/cancel`)
              .then(() => setOrders((prev) => prev.filter((o) => o._id !== item._id)))
              .catch((error) => console.error('Failed to cancel:', error));
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scheduled Orders</Text>
        <TouchableOpacity onPress={() => router.push('/scheduled-orders/new')}>
          <Plus size={20} color="#E8621A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.ordersList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Clock size={48} color="#A0A0A0" />
              <Text style={styles.emptyText}>No scheduled orders</Text>
              <TouchableOpacity style={styles.scheduleButton}>
                <Text style={styles.scheduleButtonText}>Schedule an Order</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </ScrollView>
    </View>
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
  content: {
    flex: 1,
    padding: 24,
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF1E8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8621A',
  },
  orderDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#636366',
  },
  total: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E8621A',
  },
  cancelButton: {
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#636366',
    marginTop: 16,
    marginBottom: 24,
  },
  scheduleButton: {
    backgroundColor: '#E8621A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
