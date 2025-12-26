// --- THIS IS OUR FINAL "HOME" DASHBOARD SCREEN ---
// app/(tabs)/index.tsx

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  ScrollView // We're using ScrollView now!
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://10.160.150.138:3001';

// --- (Interfaces) ---
interface Profile {
  id: number;
  name: string;
  businessName: string;
  reputationScore: number;
  // We don't need 'products' here anymore
}

interface FundingRequest {
  requestId: string;
  smeName: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'declined'; // <-- Added 'declined'
  declineReason?: string; // <-- Added optional 'declineReason'
}

const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
};

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This effect fetches ALL data for our dashboard
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true; 
      async function loadData() {
        setIsLoading(true);
        try {
          const profileResponse = await fetch(`${API_URL}/sme/profile/1`);
          const profileData = await profileResponse.json() as Profile;

          const requestsResponse = await fetch(`${API_URL}/bank/opportunities`);
          const requestsData = await requestsResponse.json() as FundingRequest[];

          if (isActive) {
            setProfile(profileData);
            setRequests(requestsData);
          }
        } catch (e) {
          console.error("Failed to fetch data:", e);
          if (isActive) {
            setError("Could not load data.");
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }
      loadData();
      return () => { isActive = false; };
    }, [])
  );

  // This renders our request list (unchanged)
  const renderRequestList = () => {
    if (requests.length === 0) {
      return <Text style={styles.noRequestsText}>No funding requests submitted yet.</Text>;
    }
    
    // This helper function is now correct
    const getStatusStyles = (status: 'pending' | 'approved' | 'declined') => {
      if (status === 'approved') {
        return {
          text: 'Approved',
          badgeColor: '#28a745' // Green
        };
      }
      if (status === 'declined') {
        return {
          text: 'Declined',
          badgeColor: '#dc3545' // Red
        };
      }
      // Default is 'pending'
      return {
        text: 'Pending',
        badgeColor: '#ffc107' // Yellow
      };
    };

    return requests.slice().reverse().map((req) => {
      // --- FIX 2: We can now safely remove "as any" ---
      // TypeScript knows 'req.status' is valid
      const { text, badgeColor } = getStatusStyles(req.status);

      return (
        <View key={req.requestId} style={styles.requestCard}>
          <Text style={styles.requestPurpose}>{req.purpose}</Text>
          <View style={styles.requestDetails}>
            <Text style={styles.requestAmount}>{formatNaira(req.amount)}</Text>
            
            <View style={[
              styles.statusBadge, 
              { backgroundColor: badgeColor } 
            ]}>
              <Text style={styles.statusText}>{text}</Text>
            </View>
          </View>
          
          {/* --- FIX 3: The "Stray Text" bug (use backticks ``) --- */}
          {req.status === 'declined' && req.declineReason && (
            <Text style={styles.declineReasonText}>
              {`Reason: ${req.declineReason}`}
            </Text>
          )}
        </View>
      );
    });
  };

  if (isLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#004a99" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  // This is our main dashboard layout
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.businessName}>{profile.businessName}</Text>
        </View>

        <View style={styles.repCard}>
          <Text style={styles.repTitle}>My Reputation Score</Text>
          <Text style={styles.repScore}>{profile.reputationScore}</Text>
        </View>

        <Link href="/request-form" asChild>
          <TouchableOpacity style={styles.fundingButton}>
            <Text style={styles.fundingButtonText}>Get Fast Funding</Text>
          </TouchableOpacity>
        </Link>
        
        <View style={styles.requestsContainer}>
          <Text style={styles.listHeader}>My Recent Requests</Text>
          {renderRequestList()}
        </View>
        
        {/* THE PRODUCT LIST IS GONE! This page is clean. */}
        
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles for the Home Dashboard ---
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
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20, // Adjusted padding
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 18,
    color: '#555',
  },
  businessName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  repCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 15,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  repTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
  },
  repScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#004a99',
    marginTop: 5,
  },
  fundingButton: {
    backgroundColor: '#004a99',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  fundingButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  requestsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noRequestsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 2,
  },
  requestPurpose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004a99',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // --- FIX 4: Add the missing style ---
  declineReasonText: {
    marginTop: 10,
    fontSize: 14,
    color: '#dc3545', // Red
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },

});