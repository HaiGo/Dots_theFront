import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VerifyEmailScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color="#C1FF72" />
        </View>

          <Text style={styles.title}>Check Your Email</Text>
          
          <Text style={styles.message}>
            We&apos;ve sent you a verification link to your email address.
          </Text>

          <Text style={styles.instructions}>
            Please click the link in the email to verify your account, then return here to continue.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Continue to Login</Text>
          </TouchableOpacity>

          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Didn&apos;t receive the email?</Text>
            <Text style={styles.helpSubtext}>
              Check your spam folder or contact support
            </Text>
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000000',
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333333',
    marginBottom: 15,
    lineHeight: 24,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#C1FF72',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  helpSubtext: {
    fontSize: 12,
    color: '#999999',
  },
});

