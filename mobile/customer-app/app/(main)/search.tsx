import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { api } from '../../../shared/api';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'restaurants' | 'vendors'>('restaurants');

  const handleSearch = async () => {
    if (!query) return;
    
    setLoading(true);
    try {
      const endpoint = tab === 'restaurants' ? '/restaurants' : '/vendors';
      const response = await api.get(`${endpoint}?search=${query}`);
      setResults(response.data[tab] || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRestaurant = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push(`/restaurant/${item._id}`)}
    >
      <View style={styles.resultImage}>
        <Text style={styles.imagePlaceholder}>🍽️</Text>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultCuisine}>{item.cuisine}</Text>
        <Text style={styles.resultRating}>⭐ {item.rating}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={20} color="#A0A0A0" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            autoFocus
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <SlidersHorizontal size={20} color="#E8621A" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'restaurants' && styles.tabActive]}
          onPress={() => setTab('restaurants')}
        >
          <Text style={[styles.tabText, tab === 'restaurants' && styles.tabTextActive]}>
            Restaurants
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'vendors' && styles.tabActive]}
          onPress={() => setTab('vendors')}
        >
          <Text style={[styles.tabText, tab === 'vendors' && styles.tabTextActive]}>
            Vendors
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        renderItem={renderRestaurant}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.resultsContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No results found</Text>
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
    gap: 12,
    padding: 24,
    paddingTop: 50,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#E8621A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    padding: 24,
    gap: 16,
  },
  resultCard: {
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
  resultImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    fontSize: 32,
  },
  resultContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  resultCuisine: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 4,
  },
  resultRating: {
    fontSize: 12,
    color: '#E8621A',
    fontWeight: '600',
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
    fontSize: 16,
    color: '#636366',
  },
});
