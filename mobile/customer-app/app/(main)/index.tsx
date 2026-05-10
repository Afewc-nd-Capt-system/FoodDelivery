import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Search, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../shared/api';

const moodCategories = [
  { emoji: '🍚', name: 'Rice' },
  { emoji: '🥣', name: 'Swallow' },
  { emoji: '🔥', name: 'Grills' },
  { emoji: '🍔', name: 'Fast Food' },
  { emoji: '🍲', name: 'Soups' },
  { emoji: '🥤', name: 'Drinks' },
  { emoji: '🍿', name: 'Snacks' },
  { emoji: '🍰', name: 'Desserts' },
  { emoji: '🦞', name: 'Seafood' },
  { emoji: '🥗', name: 'Healthy' },
];

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [restaurants, setRestaurants] = useState([]);
  const [ads, setAds] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [restaurantsRes, adsRes] = await Promise.all([
        api.get('/restaurants'),
        api.get('/ads/active?placement=homepage_banner'),
      ]);
      setRestaurants(restaurantsRes.data.restaurants || []);
      setAds(adsRes.data.ads || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderCategory = ({ item, index }: { item: typeof moodCategories[0]; index: number }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === index && styles.categoryCardActive,
      ]}
      onPress={() => setSelectedCategory(index)}
    >
      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
      <Text style={[
        styles.categoryName,
        selectedCategory === index && styles.categoryNameActive,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRestaurant = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${item._id}`)}
    >
      <View style={styles.restaurantImage}>
        <Text style={styles.restaurantImagePlaceholder}>🍽️</Text>
        {item.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}% OFF</Text>
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{item.rating} ⭐</Text>
        </View>
      </View>
      <View style={styles.restaurantContent}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantCuisine}>{item.cuisine}</Text>
        <View style={styles.restaurantMeta}>
          <Clock size={14} color="#636366" />
          <Text style={styles.deliveryTime}>{item.deliveryTime}</Text>
          <Text style={styles.priceRange}>{item.priceRange}</Text>
        </View>
        {item.freeDelivery && (
          <Text style={styles.freeDelivery}>Free Delivery</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderAd = (ad: any) => (
    <TouchableOpacity
      style={styles.adBanner}
      onPress={() => {
        api.post(`/ads/${ad._id}/click`);
        router.push(ad.creative.link || '/');
      }}
    >
      <LinearGradient colors={['#E8621A', '#C4501A']} style={styles.adGradient}>
        <Text style={styles.adTitle}>{ad.creative.headline}</Text>
        <Text style={styles.adDescription}>{ad.creative.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8621A" />
      }
    >
      <LinearGradient colors={['#1A0E0A', '#2C1810']} style={styles.header}>
        <TouchableOpacity style={styles.locationRow}>
          <MapPin size={16} color="#E8621A" />
          <Text style={styles.locationText}>Lagos</Text>
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Search size={20} color="#A0A0A0" />
          <Text style={styles.searchPlaceholder}>Search restaurants...</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Mood</Text>
        <FlatList
          data={moodCategories}
          renderItem={renderCategory}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />

        {ads.length > 0 && ads.map((ad, index) => (
          <View key={index} style={styles.adContainer}>
            {renderAd(ad)}
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Restaurants</Text>
          <TouchableOpacity onPress={() => router.push('/restaurants')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={restaurants.slice(0, 5)}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.restaurantsContainer}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby</Text>
          <TouchableOpacity onPress={() => router.push('/restaurants')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.restaurantsVerticalContainer}
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
    paddingBottom: 48,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  searchButton: {
    backgroundColor: '#E8621A',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    marginTop: -24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#E8621A',
    fontWeight: '600',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryCardActive: {
    backgroundColor: '#E8621A',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636366',
  },
  categoryNameActive: {
    color: '#FFFFFF',
  },
  adContainer: {
    marginBottom: 24,
  },
  adBanner: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  adGradient: {
    padding: 24,
  },
  adTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  adDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  restaurantsContainer: {
    gap: 16,
  },
  restaurantsVerticalContainer: {
    gap: 16,
  },
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  restaurantImage: {
    height: 176,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  restaurantImagePlaceholder: {
    fontSize: 48,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#BE3A2A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  restaurantContent: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#636366',
  },
  priceRange: {
    fontSize: 12,
    color: '#636366',
  },
  freeDelivery: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
  },
});
