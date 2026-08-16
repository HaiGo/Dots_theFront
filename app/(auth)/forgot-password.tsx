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
import { API_CONFIG } from '../../config/api';

type ResetStep = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const [currentStep, setCurrentStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      // If available is true, email doesn't exist. We want the opposite.
      return !data.available;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleRequestCode = async () => {
    setError('');

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setCheckingEmail(true);

    // Check if email exists in database
    const emailExists = await checkEmailExists(email.toLowerCase().trim());
    
    setCheckingEmail(false);

    if (!emailExists) {
      setError('No account found with this email address. Please check your email or create a new account.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentStep('code');
      } else {
        setError(data.error?.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');

    // Validation
    if (!code) {
      setError('Please enter the reset code');
      return;
    }

    if (code.length !== 6) {
      setError('Reset code must be 6 digits');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: code.trim(),
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success and navigate to login
        router.replace('/(auth)/login');
        // Note: You might want to show a success alert here
      } else {
        // Handle specific error codes
        const errorCode = data.error?.code;
        switch (errorCode) {
          case 'AUTH_PASSWORD_RESET_CODE_INVALID':
            setError('Invalid reset code. Please check and try again.');
            break;
          case 'AUTH_PASSWORD_RESET_CODE_EXPIRED':
            setError('Reset code has expired. Please request a new one.');
            break;
          case 'AUTH_PASSWORD_TOO_SHORT':
            setError('Password must be at least 6 characters.');
            break;
          case 'AUTH_USER_NOT_FOUND':
            setError('User not found. Please check your email.');
            break;
          default:
            setError(data.error?.message || 'Failed to reset password. Please try again.');
        }
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep === 'code') {
      setCurrentStep('email');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      router.back();
    }
  };

  const handleRequestNewCode = async () => {
    setError('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    
    setCheckingEmail(true);

    // Check if email exists in database
    const emailExists = await checkEmailExists(email.toLowerCase().trim());
    
    setCheckingEmail(false);

    if (!emailExists) {
      setError('No account found with this email address. Please check your email or create a new account.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Stay on code step, just show success
        setError('');
      } else {
        setError(data.error?.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
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
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>

            {/* Logo */}
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            {/* Title & Subtitle */}
            {currentStep === 'email' ? (
              <>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we'll send you a 6-digit code to reset your password
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Enter Reset Code</Text>
                <Text style={styles.subtitle}>
                  We've sent a 6-digit code to {email}. The code expires in 15 minutes.
                </Text>
              </>
            )}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {currentStep === 'email' ? (
                // Email Input
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#525252"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setError('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      editable={!loading}
                    />
                  </View>
                </View>
              ) : (
                // Code and Password Inputs
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>6-Digit Code</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="key-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter code from email"
                        placeholderTextColor="#525252"
                        value={code}
                        onChangeText={(text) => {
                          setCode(text.replace(/[^0-9]/g, ''));
                          setError('');
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Min 6 characters"
                        placeholderTextColor="#525252"
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          setError('');
                        }}
                        secureTextEntry={!showPassword}
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
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter password"
                        placeholderTextColor="#525252"
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          setError('');
                        }}
                        secureTextEntry={!showConfirmPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={18}
                          color="#A4A4A4"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Request New Code Link */}
                  <TouchableOpacity 
                    onPress={handleRequestNewCode}
                    disabled={loading}
                    style={styles.requestNewCodeContainer}
                  >
                    <Text style={styles.requestNewCodeText}>Didn't receive a code? Request new code</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Section - Action Button */}
        <View style={styles.bottomSection}>
          {loading || checkingEmail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C1FF72" style={styles.loader} />
              <Text style={styles.loadingText}>
                {checkingEmail ? 'Checking email...' : currentStep === 'email' ? 'Sending code...' : 'Resetting password...'}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.button} 
                onPress={currentStep === 'email' ? handleRequestCode : handleResetPassword}
              >
                <Text style={styles.buttonText}>
                  {currentStep === 'email' ? 'Send Reset Code' : 'Reset Password'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#000000" />
              </TouchableOpacity>

              {/* Back to Login Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/login')}
                style={styles.loginContainer}
              >
                <Text style={styles.loginText}>
                  Back to <Text style={styles.loginLink}>Log In</Text>
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
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#707070',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
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
  inputLabel: {
    fontSize: 10,
    color: '#505050',
    marginBottom: 8,
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
    fontSize: 14,
    color: '#525252',
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  requestNewCodeContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  requestNewCodeText: {
    fontSize: 14,
    color: '#707070',
    textDecorationLine: 'underline',
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
    marginBottom: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
  },
  loginContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginText: {
    fontSize: 14,
    color: '#000000',
  },
  loginLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

