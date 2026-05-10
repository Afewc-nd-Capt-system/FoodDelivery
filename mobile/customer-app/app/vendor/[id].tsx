import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Clock } from 'lucide-react-native';
import { api } from '../../../shared/api';

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams();
  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await api.get(`/vendors/${id}`);
      setVendor(response.data.vendor);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.productImage}>
        <Text style={styles.imagePlaceholder}>📦</Text>
      </View>
      <View style={styles.productContent}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.productPrice}>₦{item.price?.toLocaleString()}</Text>
      </View>
    </View>
  );

  if (!vendor) {
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
        <View style={styles.vendorImage}>
          <Text style={styles.imagePlaceholderLarge}>📦</Text>
        </View>

        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{vendor.name}</Text>
          <Text style={styles.vendorCategory}>{vendor.category}</Text>
          <View style={styles.vendorMeta}>
            <Star size={14} color="#E8621A" />
            <Text style={styles.rating}>{vendor.rating}</Text>
            <Clock size={14} color="#636366" />
            <Text style={styles.deliveryTime}>{vendor.deliveryTime}</Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Products</Text>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.productsList}
          />
        </View>
      </ScrollView>
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
  vendorImage: {
    height: 224,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0EAE0',
  },
  imagePlaceholderLarge: {
    fontSize: 64,
  },
  vendorInfo: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginTop: -24,
  },
  vendorName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  vendorCategory: {
    fontSize: 14,
    color: '#636366',
    marginBottom: 12,
  },
  vendorMeta: {
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
  productsSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  productsList: {
    gap: 16,
  },
  productCard: {
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
  productImage: {
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
  productContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E8621A',
  },
});
