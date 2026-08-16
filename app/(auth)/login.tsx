import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { authService } from '../../services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // Clear previous error
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    // Lowercase email before sending (password stays case-sensitive)
    const loginResult = await authService.login(email.toLowerCase().trim(), password);

    setLoading(false);

    if (loginResult.success) {
      // Login successful
      router.replace('/(tabs)');
    } else {
      // Handle specific error codes from backend
      switch (loginResult.errorCode) {
        case 'AUTH_INVALID_CREDENTIALS':
        case 'AUTH_USER_NOT_FOUND':
          // Show error message for wrong credentials
          setError('Incorrect email or password. Please try again.');
          break;

        case 'AUTH_EMAIL_NOT_VERIFIED':
          setError('Please verify your email before logging in.');
          break;

        case 'NETWORK_ERROR':
          setError('Unable to connect to server. Please check your internet connection.');
          break;

        default:
          setError(loginResult.error || 'Login failed. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo */}
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            {/* Title */}
            <Text style={styles.title}>Log In</Text>
            
            {/* Subtitle */}
            <Text style={styles.subtitle}>Welcome back, you've been missed</Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder=""
                    placeholderTextColor="#525252"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(''); // Clear error on input
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder=""
                    placeholderTextColor="#525252"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError(''); // Clear error on input
                    }}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color="#A4A4A4"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push('/(auth)/forgot-password')}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPassword}>Forgot Your Password?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Section - Login Button and Register Link */}
        <View style={styles.bottomSection}>
          {loading ? (
            <ActivityIndicator size="large" color="#C1FF72" style={styles.loader} />
          ) : (
            <>
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin}
              >
                <Text style={styles.buttonText}>Log In</Text>
                <Ionicons name="chevron-forward" size={24} color="#000000" />
              </TouchableOpacity>

              {/* Create Account Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/register')}
                style={styles.createAccountContainer}
              >
                <Text style={styles.createAccountText}>
                  Don't have an account? <Text style={styles.createAccountLink}>Create Account</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#707070',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10,
    color: '#505050',
    marginLeft: 4,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    height: 46,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: '#525252',
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPassword: {
    fontSize: 11,
    color: '#000000',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    height: 50,
    backgroundColor: '#C1FF72',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loader: {
    marginVertical: 20,
  },
  createAccountContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  createAccountText: {
    fontSize: 14,
    color: '#000000',
  },
  createAccountLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

