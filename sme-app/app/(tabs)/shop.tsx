// --- THIS IS OUR NEW "MY SHOP" (PRODUCT LIST) SCREEN ---
// app/(tabs)/shop.tsx

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  Image
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://10.160.150.138:3001';

// --- (Interfaces) ---
interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
};

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch products every time this tab is viewed
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      async function fetchProducts() {
        setIsLoading(true);
        try {
          // We fetch from the profile endpoint but only care about products
          const response = await fetch(`${API_URL}/sme/profile/1`);
          const data = await response.json();
          if (isActive && data.products) {
            setProducts(data.products);
          }
        } catch (e) {
          console.error("Failed to fetch products:", e);
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }
      fetchProducts();
      return () => { isActive = false; };
    }, [])
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image 
        style={styles.productImage} 
        source={{ uri: item.imageUrl }} 
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatNaira(item.price)}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#004a99" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>My Products</Text>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

// --- (Styles: these are mostly copied from index.tsx) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
});