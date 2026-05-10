import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Phone, MessageSquare, Star } from 'lucide-react-native';
import { getTrackingSocket } from '../../../shared/socket';
import { LinearGradient } from 'expo-linear-gradient';

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams();
  const [status, setStatus] = useState('confirmed');
  const [eta, setEta] = useState(25);
  const [rider, setRider] = useState<any>(null);

  useEffect(() => {
    const socket = getTrackingSocket();
    socket?.emit('watch_order', { orderId });
    
    socket?.on('order_status_change', (data) => {
      setStatus(data.status);
    });

    socket?.on('rider_location', (data) => {
      // Update rider position on map
    });

    return () => {
      socket?.off('order_status_change');
      socket?.off('rider_location');
    };
  }, [orderId]);

  const statuses = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'on_the_way', label: 'On the Way' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const currentIndex = statuses.findIndex(s => s.key === status);

  const renderStatusStep = (step: typeof statuses[0], index: number) => (
    <View key={step.key} style={styles.statusStep}>
      <View style={[
        styles.statusDot,
        index <= currentIndex && styles.statusDotActive,
        index < currentIndex && styles.statusDotComplete,
      ]}>
        {index < currentIndex && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[
        styles.statusLabel,
        index <= currentIndex && styles.statusLabelActive,
      ]}>
        {step.label}
      </Text>
      {index < statuses.length - 1 && (
        <View style={[
          styles.statusLine,
          index < currentIndex && styles.statusLineActive,
        ]} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>🗺️</Text>
            <Text style={styles.mapPlaceholderSubtext}>Map View</Text>
          </View>
        </View>

        <LinearGradient colors={['#E8621A', '#BE3A2A']} style={styles.etaCard}>
          <Text style={styles.etaLabel}>Estimated Arrival</Text>
          <Text style={styles.etaTime}>{eta} mins</Text>
          <Text style={styles.etaSubtext}>Your order is on the way</Text>
        </LinearGradient>

        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.statusTimeline}>
            {statuses.map(renderStatusStep)}
          </View>
        </View>

        {status === 'on_the_way' && rider && (
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{rider.name?.charAt(0) || 'R'}</Text>
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{rider.name}</Text>
                <Text style={styles.driverRating}>⭐ {rider.rating}</Text>
              </View>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.driverAction}>
                <Phone size={20} color="#E8621A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.driverAction}>
                <MessageSquare size={20} color="#E8621A" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'delivered' && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate Your Order</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star}>
                  <Star size={32} color="#E8621A" fill="#E8621A" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        )}
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
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#F0EAE0',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 48,
  },
  mapPlaceholderSubtext: {
    fontSize: 16,
    color: '#636366',
    marginTop: 8,
  },
  etaCard: {
    margin: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  etaLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  etaTime: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  etaSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 24,
  },
  statusTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusStep: {
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDotActive: {
    backgroundColor: '#E8621A',
  },
  statusDotComplete: {
    backgroundColor: '#16A34A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusLine: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: -16,
    height: 2,
    backgroundColor: '#E8E8E8',
    zIndex: -1,
  },
  statusLineActive: {
    backgroundColor: '#E8621A',
  },
  statusLabel: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  statusLabelActive: {
    color: '#E8621A',
    fontWeight: '600',
  },
  driverCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8621A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  driverDetails: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    color: '#636366',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  driverAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#E8621A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
