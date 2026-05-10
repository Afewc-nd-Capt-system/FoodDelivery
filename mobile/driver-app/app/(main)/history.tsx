import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Star } from 'lucide-react-native';
import { api } from '../../../shared/api';

export default function DriverHistoryScreen() {
  const [deliveries, setDeliveries] useState([
    {
      id: '1',
      orderId: '12345',
      date: '2024-01-15',
      pickupArea: 'Lekki',
      dropoffArea: 'Victoria Island',
      earnings: 1500,
      customerRating: 5,
    },
    {
      id: '2',
      orderId: '12344',
      date: '2024-01-14',
      pickupArea: 'Ikeja',
      dropoffArea: 'Lekki',
      earnings: 2000,
      customerRating: 4,
    },
    {
      id: '3',
      orderId: '12343',
      date: '2024-01-13',
      pickupArea: 'Victoria Island',
      dropoffArea: 'Ikoyi',
      earnings: 1200,
      customerRating: 5,
    },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch deliveries
    setRefreshing(false);
  };

  const renderDelivery = ({ item }: { item: any }) => (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryHeader}>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.orderId}>#{item.orderId}</Text>
      </View>
      <View style={styles.routeInfo}>
        <Text style={styles.routeText}>📍 {item.pickupArea}</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.routeText}>📍 {item.dropoffArea}</Text>
      </View>
      <View style={styles.deliveryFooter}>
        <Text style={styles.earnings}>₦{item.earnings.toLocaleString()}</Text>
        <View style={styles.rating}>
          <Star size={14} color="#E8621A" fill="#E8621A" />
          <Text style={styles.ratingText}>{item.customerRating}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery History</Text>
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.deliveriesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8621A" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No deliveries yet</Text>
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
  header: {
    padding: 24,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  deliveriesList: {
    padding: 24,
    gap: 16,
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: '#636366',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  routeInfo: {
    marginBottom: 12,
    gap: 4,
  },
  routeText: {
    fontSize: 14,
    color: '#636366',
  },
  arrow: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earnings: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E8621A',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8621A',
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
