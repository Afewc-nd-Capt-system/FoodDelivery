import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { api } from '../../shared/api';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([
    { _id: '1', name: 'Jollof Palace', cuisine: 'Nigerian', rating: 4.5, deliveryTime: '25-35 min', image: '🍚' },
    { _id: '2', name: 'Grill House', cuisine: 'Grills', rating: 4.8, deliveryTime: '30-40 min', image: '🔥' },
    { _id: '3', name: 'Soup Kitchen', cuisine: 'Soups', rating: 4.3, deliveryTime: '20-30 min', image: '🍲' },
  ]);

  const renderFavorite = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.favoriteCard}
      onPress={() => router.push(`/restaurant/${item._id}`)}
    >
      <View style={styles.favoriteImage}>
        <Text style={styles.imagePlaceholder}>{item.image}</Text>
        <TouchableOpacity style={styles.removeButton}>
          <Heart size={20} color="#D32F2F" fill="#D32F2F" />
        </TouchableOpacity>
      </View>
      <View style={styles.favoriteContent}>
        <Text style={styles.favoriteName}>{item.name}</Text>
        <Text style={styles.favoriteCuisine}>{item.cuisine}</Text>
        <View style={styles.favoriteMeta}>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
          <Text style={styles.deliveryTime}>{item.deliveryTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Restaurants</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.favoritesList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Heart size={48} color="#A0A0A0" />
            <Text style={styles.emptyText}>No saved restaurants yet</Text>
            <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(main)')}>
              <Text style={styles.browseButtonText}>Browse Restaurants</Text>
            </TouchableOpacity>
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
  favoritesList: {
    padding: 24,
    gap: 16,
  },
  favoriteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  favoriteImage: {
    width: 100,
    height: 100,
    backgroundColor: '#F0EAE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    fontSize: 40,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  favoriteContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  favoriteCuisine: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 8,
  },
  favoriteMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  rating: {
    fontSize: 12,
    color: '#E8621A',
    fontWeight: '600',
  },
  deliveryTime: {
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
  browseButton: {
    backgroundColor: '#E8621A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
