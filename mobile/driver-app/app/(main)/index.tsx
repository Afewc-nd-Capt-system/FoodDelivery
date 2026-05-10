import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ToggleLeft, ToggleRight, Phone, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../shared/api';
import * as Location from 'expo-location';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [todaysEarnings, setTodaysEarnings] = useState(8500);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<'none' | 'new' | 'heading_to_restaurant' | 'picked_up' | 'delivering'>('none');

  const toggleOnline = async () => {
    try {
      const response = await api.patch('/riders/availability', { isOnline: !isOnline });
      setIsOnline(!isOnline);

      if (!isOnline) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Start location tracking
        }
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleAcceptOrder = async () => {
    try {
      await api.patch(`/delivery/orders/${activeOrder._id}/assign-rider`);
      setOrderStatus('heading_to_restaurant');
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const handleConfirmPickup = async () => {
    try {
      await api.patch(`/delivery/orders/${activeOrder._id}/picked-up`);
      setOrderStatus('delivering');
    } catch (error) {
      console.error('Error confirming pickup:', error);
    }
  };

  const handleConfirmDelivery = async () => {
    try {
      await api.patch(`/delivery/orders/${activeOrder._id}/delivered`);
      setActiveOrder(null);
      setOrderStatus('none');
    } catch (error) {
      console.error('Error confirming delivery:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Portal</Text>
      </View>

      <TouchableOpacity style={styles.onlineToggle} onPress={toggleOnline}>
        <View style={styles.toggleContent}>
          <View style={[styles.toggleIcon, isOnline && styles.toggleIconOnline]}>
            {isOnline ? <ToggleRight size={32} color="#16A34A" /> : <ToggleLeft size={32} color="#A0A0A0" />}
          </View>
          <Text style={styles.toggleLabel}>You are {isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          <Text style={styles.toggleSubtext}>{isOnline ? 'Accepting orders' : 'Not accepting orders'}</Text>
        </View>
      </TouchableOpacity>

      <LinearGradient colors={['#E8621A', '#C4501A']} style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Today's Earnings</Text>
        <Text style={styles.earningsAmount}>₦{todaysEarnings.toLocaleString()}</Text>
      </LinearGradient>

      {orderStatus === 'new' && activeOrder && (
        <View style={styles.newOrderCard}>
          <Text style={styles.newOrderTitle}>New Order Request</Text>
          <View style={styles.orderDetails}>
            <Text style={styles.restaurantName}>{activeOrder.restaurant?.name}</Text>
            <Text style={styles.addressText}>From: {activeOrder.pickupAddress}</Text>
            <Text style={styles.addressText}>To: {activeOrder.deliveryAddress}</Text>
            <Text style={styles.earningText}>Estimated earning: ₦{activeOrder.earning?.toLocaleString()}</Text>
          </View>
          <View style={styles.orderActions}>
            <TouchableOpacity style={styles.declineButton}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptOrder}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {orderStatus !== 'none' && activeOrder && (
        <View style={styles.activeDeliveryCard}>
          <Text style={styles.activeTitle}>Active Delivery</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{orderStatus.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <MapPin size={20} color="#E8621A" />
              <Text style={styles.routeText}>{activeOrder.pickupAddress}</Text>
            </View>
            <View style={styles.routePoint}>
              <MapPin size={20} color="#16A34A" />
              <Text style={styles.routeText}>{activeOrder.deliveryAddress}</Text>
            </View>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{activeOrder.customer?.name}</Text>
            <TouchableOpacity style={styles.phoneButton}>
              <Phone size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {orderStatus === 'heading_to_restaurant' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleConfirmPickup}>
              <Text style={styles.actionButtonText}>Confirm Pickup</Text>
            </TouchableOpacity>
          )}
          {orderStatus === 'delivering' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleConfirmDelivery}>
              <Text style={styles.actionButtonText}>Confirm Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {orderStatus === 'none' && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyText}>No active deliveries</Text>
          <Text style={styles.emptySubtext}>Go online to receive orders</Text>
        </View>
      )}
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
  onlineToggle: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  toggleContent: {
    alignItems: 'center',
  },
  toggleIcon: {
    marginBottom: 16,
  },
  toggleIconOnline: {
    transform: [{ rotate: '180deg' }],
  },
  toggleLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  toggleSubtext: {
    fontSize: 14,
    color: '#636366',
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
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  newOrderCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  newOrderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  orderDetails: {
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#636366',
    marginBottom: 4,
  },
  earningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeDeliveryCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8621A',
  },
  routeCard: {
    backgroundColor: '#F0EAE0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  phoneButton: {
    backgroundColor: '#E8621A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#E8621A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#636366',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A0A0A0',
  },
});
