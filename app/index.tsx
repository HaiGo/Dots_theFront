import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { authService } from '../services/authService';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔐 Checking authentication status...');
      
      // Small delay to ensure app is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check auth status with full validation
      // This checks: token exists, not expired, and validates with backend
      const authStatus = await authService.checkAuthStatus(true);
      
      if (authStatus.isAuthenticated) {
        console.log('✅ User is authenticated');
        setIsAuthenticated(true);
      } else {
        console.log('❌ User is not authenticated:', authStatus.reason || 'Unknown reason');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

