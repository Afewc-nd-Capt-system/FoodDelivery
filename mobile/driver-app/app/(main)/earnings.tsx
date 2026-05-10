import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../shared/api';

export default function DriverEarningsScreen() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [totalEarnings, setTotalEarnings] = useState(8500);
  const [deliveries, setDeliveries] = useState([
    { id: '1', orderId: '12345', pickupArea: 'Lekki', dropoffArea: 'Victoria Island', amount: 1500, date: '2024-01-15' },
    { id: '2', orderId: '12344', pickupArea: 'Ikeja', dropoffArea: 'Lekki', amount: 2000, date: '2024-01-15' },
    { id: '3', orderId: '12343', pickupArea: 'Victoria Island', dropoffArea: 'Ikoyi', amount: 1200, date: '2024-01-14' },
  ]);

  const weeklyData = [
    { day: 'Mon', earnings: 4500 },
    { day: 'Tue', earnings: 6200 },
    { day: 'Wed', earnings: 5800 },
    { day: 'Thu', earnings: 7500 },
    { day: 'Fri', earnings: 8200 },
    { day: 'Sat', earnings: 9500 },
    { day: 'Sun', earnings: 7000 },
  ];

  const renderDelivery = ({ item }: { item: any }) => (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryHeader}>
        <Text style={styles.orderId}>Order #{item.orderId}</Text>
        <Text style={styles.deliveryDate}>{item.date}</Text>
      </View>
      <View style={styles.routeInfo}>
        <Text style={styles.routeText}>From: {item.pickupArea}</Text>
        <Text style={styles.routeText}>To: {item.dropoffArea}</Text>
      </View>
      <Text style={styles.earning}>₦{item.amount.toLocaleString()}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <View style={styles.periodSelector}>
        {['today', 'week', 'month'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p as any)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <LinearGradient colors={['#E8621A', '#C4501A']} style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
        <Text style={styles.earningsAmount}>₦{totalEarnings.toLocaleString()}</Text>
        <View style={styles.earningsMeta}>
          <TrendingUp size={16} color="#FFFFFF" />
          <Text style={styles.earningsChange}>+12% from last period</Text>
        </View>
      </LinearGradient>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Weekly Earnings</Text>
        <View style={styles.chartContainer}>
          {weeklyData.map((item) => (
            <View key={item.day} style={styles.barContainer}>
              <View style={[
                styles.bar,
                { height: (item.earnings / 10000) * 150 }
              ]} />
              <Text style={styles.barLabel}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.deliveriesSection}>
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
        <FlatList
          data={deliveries}
          renderItem={renderDelivery}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.deliveriesList}
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
    padding: 24,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    padding: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#E8621A',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  earningsCard: {
    margin: 24,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  earningsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earningsChange: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chartSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 24,
    backgroundColor: '#E8621A',
    borderRadius: 12,
  },
  barLabel: {
    fontSize: 12,
    color: '#636366',
  },
  deliveriesSection: {
    padding: 24,
  },
  deliveriesList: {
    gap: 12,
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  deliveryDate: {
    fontSize: 12,
    color: '#636366',
  },
  routeInfo: {
    marginBottom: 8,
  },
  routeText: {
    fontSize: 14,
    color: '#636366',
  },
  earning: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E8621A',
  },
});
