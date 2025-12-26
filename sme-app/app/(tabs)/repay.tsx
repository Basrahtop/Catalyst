// --- THIS IS OUR NEW "REPAY" SCREEN ---
// app/(tabs)/repay.tsx

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RepayScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Make a Repayment</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.infoText}>Your next repayment for the "New Ankara materials" loan is due on Dec 1, 2025.</Text>
        
        <View style={styles.loanCard}>
          <Text style={styles.loanAmount}>₦50,000</Text>
          <Text style={styles.loanLabel}>Next Payment</Text>
        </View>

        <TouchableOpacity style={styles.repayButton}>
          <Text style={styles.repayButtonText}>Pay ₦50,000 Now</Text>
        </TouchableOpacity>
        
        <Text style={styles.comingSoon}>
          (Full repayment history and scheduling will be shown here. This is our "V2" feature for the judges!)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  headerContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    lineHeight: 24,
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loanAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#004a99',
  },
  loanLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  repayButton: {
    backgroundColor: '#28a745', // Green for "pay"
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  repayButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  comingSoon: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  }
});