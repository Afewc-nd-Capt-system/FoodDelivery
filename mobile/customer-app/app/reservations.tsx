import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Calendar, Plus } from 'lucide-react-native';
import { api } from '../../shared/api';

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState([
    { _id: '1', restaurant: 'Jollof Palace', date: '2024-01-20', time: '19:00', guests: 4, status: 'confirmed' },
    { _id: '2', restaurant: 'Grill House', date: '2024-01-25', time: '20:00', guests: 2, status: 'pending' },
  ]);

  const renderReservation = ({ item }: { item: any }) => (
    <View style={styles.reservationCard}>
      <View style={styles.reservationHeader}>
        <Text style={styles.restaurantName}>{item.restaurant}</Text>
        <View style={[styles.statusBadge, item.status === 'confirmed' && styles.statusConfirmed]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.reservationDetails}>
        <View style={styles.detailRow}>
          <Calendar size={16} color="#636366" />
          <Text style={styles.detailText}>{item.date} at {item.time}</Text>
        </View>
        <Text style={styles.guests}>{item.guests} guests</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservations</Text>
        <TouchableOpacity onPress={() => router.push('/reservations/new')}>
          <Plus size={20} color="#E8621A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <FlatList
          data={reservations}
          renderItem={renderReservation}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.reservationsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Calendar size={48} color="#A0A0A0" />
              <Text style={styles.emptyText}>No reservations yet</Text>
              <TouchableOpacity style={styles.bookButton}>
                <Text style={styles.bookButtonText}>Book a Table</Text>
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
  reservationsList: {
    gap: 16,
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  reservationHeader: {
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
  statusConfirmed: {
    backgroundColor: '#F0FDF4',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8621A',
  },
  reservationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#636366',
  },
  guests: {
    fontSize: 14,
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
    marginBottom: 24,
  },
  bookButton: {
    backgroundColor: '#E8621A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
