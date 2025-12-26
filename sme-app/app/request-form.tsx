// --- THIS IS THE FIXED request-form.tsx ---

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const API_URL = 'http://10.160.150.138:3001';

// --- 1. We add the formatNaira function WITH types ---
const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
};

export default function FundingScreen() {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmitRequest = async () => {
    // We clean the amount string of commas or symbols, just in case
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''));

    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid number for the amount.');
      return;
    }
    
    if (!purpose) {
      Alert.alert('Missing Info', 'Please fill out the purpose field.');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/funding/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smeId: 1, 
          amount: numericAmount,
          purpose: purpose,
        }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const result = await response.json();
      
      if (result.status === 'pending') {
        Alert.alert(
          'Request Submitted!',
          'Your funding request has been sent to our partners.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
      
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not submit your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. We create a variable for the button text ---
  // This is cleaner than complex logic in the JSX
  let buttonText = 'Request Funding';
  if (isLoading) {
    buttonText = ''; // The spinner will show
  } else if (amount) {
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
    if (numericAmount > 0) {
      buttonText = `Request ${formatNaira(numericAmount)}`;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Get Fast Funding</Text>
        <Text style={styles.subtitle}>
          Your high reputation score pre-qualifies you for instant requests.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>How much do you need? (in Naira)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 500000"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>What is it for?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., New Ankara materials for a big order"
          value={purpose}
          onChangeText={setPurpose}
        />
        
        <View style={{ height: 20 }} />

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmitRequest}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            // --- 3. THE FIX! ---
            // We now use our simple, pre-calculated 'buttonText' variable.
            // This is one single expression, which is 100% safe.
            <Text style={styles.submitButtonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- Styles (unchanged) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#004a99',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
  }
});