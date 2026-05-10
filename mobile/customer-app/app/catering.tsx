import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Utensils, Plus } from 'lucide-react-native';
import { api } from '../../shared/api';

export default function CateringScreen() {
  const [orders, setOrders] = useState([
    { _id: '1', event: 'Birthday Party', date: '2024-01-20', guests: 50, status: 'pending', total: 150000 },
    { _id: '2', event: 'Wedding', date: '2024-02-14', guests: 200, status: 'confirmed', total: 500000 },
  ]);

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.eventName}>{item.event}</Text>
        <View style={[styles.statusBadge, item.status === 'confirmed' && styles.statusConfirmed]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>📅 {item.date}</Text>
        <Text style={styles.detailText}>👥 {item.guests} guests</Text>
        <Text style={styles.total}>₦{item.total.toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catering</Text>
        <TouchableOpacity onPress={() => router.push('/catering/new')}>
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
              <Utensils size={48} color="#A0A0A0" />
              <Text style={styles.emptyText}>No catering orders yet</Text>
              <TouchableOpacity style={styles.requestButton}>
                <Text style={styles.requestButtonText}>Request Catering</Text>
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
  eventName: {
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
  statusConfirmed: {
    backgroundColor: '#F0FDF4',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8621A',
  },
  orderDetails: {
    gap: 8,
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
  requestButton: {
    backgroundColor: '#E8621A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
