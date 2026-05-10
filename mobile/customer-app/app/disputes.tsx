import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Plus } from 'lucide-react-native';
import { api } from '../../shared/api';

export default function DisputesScreen() {
  const [disputes, setDisputes] = useState([
    { _id: '1', orderId: '12345', issue: 'Missing items', status: 'pending', date: '2024-01-15' },
    { _id: '2', orderId: '12344', issue: 'Wrong order', status: 'resolved', date: '2024-01-10' },
  ]);

  const renderDispute = ({ item }: { item: any }) => (
    <View style={styles.disputeCard}>
      <View style={styles.disputeHeader}>
        <Text style={styles.orderId}>Order #{item.orderId}</Text>
        <View style={[styles.statusBadge, item.status === 'resolved' && styles.statusResolved]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.issue}>{item.issue}</Text>
      <Text style={styles.date}>{item.date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disputes</Text>
        <TouchableOpacity onPress={() => router.push('/disputes/new')}>
          <Plus size={20} color="#E8621A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <FlatList
          data={disputes}
          renderItem={renderDispute}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.disputesList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <AlertTriangle size={48} color="#A0A0A0" />
              <Text style={styles.emptyText}>No disputes</Text>
              <TouchableOpacity style={styles.fileButton}>
                <Text style={styles.fileButtonText}>File a Dispute</Text>
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
  disputesList: {
    gap: 16,
  },
  disputeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
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
  statusResolved: {
    backgroundColor: '#F0FDF4',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8621A',
  },
  issue: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  date: {
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
    marginBottom: 24,
  },
  fileButton: {
    backgroundColor: '#E8621A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
