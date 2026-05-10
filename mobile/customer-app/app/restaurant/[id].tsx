import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, Star } from 'lucide-react-native';
import { api } from '../../../shared/api';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      const response = await api.get(`/restaurants/${id}`);
      setRestaurant(response.data.restaurant);
      setMenuItems(response.data.menuItems || []);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    }
  };

  const categories = ['All', ...new Set(menuItems.map((item: any) => item.category))];

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter((item: any) => item.category === selectedCategory);

  const addToCart = (item: any) => {
    setCart([...cart, { ...item, quantity: 1 }]);
  };

  const renderCategory = (category: string) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === category && styles.categoryTextActive,
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  const renderMenuItem = ({ item }: { item: any }) => (
    <View style={styles.menuItemCard}>
      <View style={styles.menuItemImage}>
        <Text style={styles.imagePlaceholder}>🍽️</Text>
      </View>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={styles.menuItemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.menuItemMeta}>
          <Clock size={12} color="#636366" />
          <Text style={styles.calories}>{item.calories} cal</Text>
        </View>
        <Text style={styles.menuItemPrice}>₦{item.price?.toLocaleString()}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  if (!restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.restaurantImage}>
          <Text style={styles.imagePlaceholderLarge}>🍽️</Text>
        </View>

        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
          <View style={styles.restaurantMeta}>
            <Star size={14} color="#E8621A" />
            <Text style={styles.rating}>{restaurant.rating}</Text>
            <Text style={styles.deliveryTime}>{restaurant.deliveryTime}</Text>
            <Text style={styles.deliveryFee}>
              {restaurant.deliveryFee === 0 ? 'Free Delivery' : `₦${restaurant.deliveryFee}`}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map(renderCategory)}
        </ScrollView>

        <FlatList
          data={filteredItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.menuList}
        />
      </ScrollView>

      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.cartText}>
            View Cart ({cart.length} items) — ₦{cart.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 24,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  restaurantImage: {
    height: 224,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0EAE0',
  },
  imagePlaceholderLarge: {
    fontSize: 64,
  },
  restaurantInfo: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginTop: -24,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#636366',
    marginBottom: 12,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8621A',
  },
  deliveryTime: {
    fontSize: 14,
    color: '#636366',
  },
  deliveryFee: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  categoriesContainer: {
    padding: 24,
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  categoryChipActive: {
    backgroundColor: '#E8621A',
    borderColor: '#E8621A',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  menuList: {
    padding: 24,
    gap: 16,
  },
  menuItemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F0EAE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    fontSize: 32,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 8,
  },
  menuItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  calories: {
    fontSize: 12,
    color: '#636366',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E8621A',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8621A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E8621A',
    padding: 20,
  },
  cartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
