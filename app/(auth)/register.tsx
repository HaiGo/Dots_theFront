import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { API_CONFIG } from '../../config/api';
import { authService } from '../../services/authService';

type RegistrationStep = 'username' | 'email' | 'phone' | 'password' | 'confirmPassword';

export default function RegisterScreen() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('username');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // All country codes
  const countryCodes = [
    { code: '+1', country: 'United States', flag: '🇺🇸' },
    { code: '+1', country: 'Canada', flag: '🇨🇦' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+20', country: 'Egypt', flag: '🇪🇬' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+30', country: 'Greece', flag: '🇬🇷' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+36', country: 'Hungary', flag: '🇭🇺' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+40', country: 'Romania', flag: '🇷🇴' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+47', country: 'Norway', flag: '🇳🇴' },
    { code: '+48', country: 'Poland', flag: '🇵🇱' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+51', country: 'Peru', flag: '🇵🇪' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+90', country: 'Turkey', flag: '🇹🇷' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
    { code: '+98', country: 'Iran', flag: '🇮🇷' },
    { code: '+212', country: 'Morocco', flag: '🇲🇦' },
    { code: '+213', country: 'Algeria', flag: '🇩🇿' },
    { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
    { code: '+218', country: 'Libya', flag: '🇱🇾' },
    { code: '+220', country: 'Gambia', flag: '🇬🇲' },
    { code: '+221', country: 'Senegal', flag: '🇸🇳' },
    { code: '+222', country: 'Mauritania', flag: '🇲🇷' },
    { code: '+223', country: 'Mali', flag: '🇲🇱' },
    { code: '+224', country: 'Guinea', flag: '🇬🇳' },
    { code: '+225', country: 'Ivory Coast', flag: '🇨🇮' },
    { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
    { code: '+227', country: 'Niger', flag: '🇳🇪' },
    { code: '+228', country: 'Togo', flag: '🇹🇬' },
    { code: '+229', country: 'Benin', flag: '🇧🇯' },
    { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
    { code: '+231', country: 'Liberia', flag: '🇱🇷' },
    { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+235', country: 'Chad', flag: '🇹🇩' },
    { code: '+236', country: 'Central African Republic', flag: '🇨🇫' },
    { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
    { code: '+238', country: 'Cape Verde', flag: '🇨🇻' },
    { code: '+239', country: 'Sao Tome and Principe', flag: '🇸🇹' },
    { code: '+240', country: 'Equatorial Guinea', flag: '🇬🇶' },
    { code: '+241', country: 'Gabon', flag: '🇬🇦' },
    { code: '+242', country: 'Congo', flag: '🇨🇬' },
    { code: '+243', country: 'DR Congo', flag: '🇨🇩' },
    { code: '+244', country: 'Angola', flag: '🇦🇴' },
    { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼' },
    { code: '+246', country: 'British Indian Ocean Territory', flag: '🇮🇴' },
    { code: '+248', country: 'Seychelles', flag: '🇸🇨' },
    { code: '+249', country: 'Sudan', flag: '🇸🇩' },
    { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
    { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
    { code: '+252', country: 'Somalia', flag: '🇸🇴' },
    { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
    { code: '+256', country: 'Uganda', flag: '🇺🇬' },
    { code: '+257', country: 'Burundi', flag: '🇧🇮' },
    { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
    { code: '+260', country: 'Zambia', flag: '🇿🇲' },
    { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
    { code: '+262', country: 'Reunion', flag: '🇷🇪' },
    { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
    { code: '+264', country: 'Namibia', flag: '🇳🇦' },
    { code: '+265', country: 'Malawi', flag: '🇲🇼' },
    { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
    { code: '+267', country: 'Botswana', flag: '🇧🇼' },
    { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
    { code: '+269', country: 'Comoros', flag: '🇰🇲' },
    { code: '+350', country: 'Gibraltar', flag: '🇬🇮' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
    { code: '+353', country: 'Ireland', flag: '🇮🇪' },
    { code: '+354', country: 'Iceland', flag: '🇮🇸' },
    { code: '+355', country: 'Albania', flag: '🇦🇱' },
    { code: '+356', country: 'Malta', flag: '🇲🇹' },
    { code: '+357', country: 'Cyprus', flag: '🇨🇾' },
    { code: '+358', country: 'Finland', flag: '🇫🇮' },
    { code: '+359', country: 'Bulgaria', flag: '🇧🇬' },
    { code: '+370', country: 'Lithuania', flag: '🇱🇹' },
    { code: '+371', country: 'Latvia', flag: '🇱🇻' },
    { code: '+372', country: 'Estonia', flag: '🇪🇪' },
    { code: '+373', country: 'Moldova', flag: '🇲🇩' },
    { code: '+374', country: 'Armenia', flag: '🇦🇲' },
    { code: '+375', country: 'Belarus', flag: '🇧🇾' },
    { code: '+376', country: 'Andorra', flag: '🇦🇩' },
    { code: '+377', country: 'Monaco', flag: '🇲🇨' },
    { code: '+378', country: 'San Marino', flag: '🇸🇲' },
    { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
    { code: '+381', country: 'Serbia', flag: '🇷🇸' },
    { code: '+382', country: 'Montenegro', flag: '🇲🇪' },
    { code: '+383', country: 'Kosovo', flag: '🇽🇰' },
    { code: '+385', country: 'Croatia', flag: '🇭🇷' },
    { code: '+386', country: 'Slovenia', flag: '🇸🇮' },
    { code: '+387', country: 'Bosnia and Herzegovina', flag: '🇧🇦' },
    { code: '+389', country: 'North Macedonia', flag: '🇲🇰' },
    { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
    { code: '+421', country: 'Slovakia', flag: '🇸🇰' },
    { code: '+423', country: 'Liechtenstein', flag: '🇱🇮' },
    { code: '+500', country: 'Falkland Islands', flag: '🇫🇰' },
    { code: '+501', country: 'Belize', flag: '🇧🇿' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+507', country: 'Panama', flag: '🇵🇦' },
    { code: '+508', country: 'Saint Pierre and Miquelon', flag: '🇵🇲' },
    { code: '+509', country: 'Haiti', flag: '🇭🇹' },
    { code: '+590', country: 'Guadeloupe', flag: '🇬🇵' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+592', country: 'Guyana', flag: '🇬🇾' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+594', country: 'French Guiana', flag: '🇬🇫' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+596', country: 'Martinique', flag: '🇲🇶' },
    { code: '+597', country: 'Suriname', flag: '🇸🇷' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+599', country: 'Curacao', flag: '🇨🇼' },
    { code: '+670', country: 'East Timor', flag: '🇹🇱' },
    { code: '+672', country: 'Antarctica', flag: '🇦🇶' },
    { code: '+673', country: 'Brunei', flag: '🇧🇳' },
    { code: '+674', country: 'Nauru', flag: '🇳🇷' },
    { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬' },
    { code: '+676', country: 'Tonga', flag: '🇹🇴' },
    { code: '+677', country: 'Solomon Islands', flag: '🇸🇧' },
    { code: '+678', country: 'Vanuatu', flag: '🇻🇺' },
    { code: '+679', country: 'Fiji', flag: '🇫🇯' },
    { code: '+680', country: 'Palau', flag: '🇵🇼' },
    { code: '+681', country: 'Wallis and Futuna', flag: '🇼🇫' },
    { code: '+682', country: 'Cook Islands', flag: '🇨🇰' },
    { code: '+683', country: 'Niue', flag: '🇳🇺' },
    { code: '+685', country: 'Samoa', flag: '🇼🇸' },
    { code: '+686', country: 'Kiribati', flag: '🇰🇮' },
    { code: '+687', country: 'New Caledonia', flag: '🇳🇨' },
    { code: '+688', country: 'Tuvalu', flag: '🇹🇻' },
    { code: '+689', country: 'French Polynesia', flag: '🇵🇫' },
    { code: '+690', country: 'Tokelau', flag: '🇹🇰' },
    { code: '+691', country: 'Micronesia', flag: '🇫🇲' },
    { code: '+692', country: 'Marshall Islands', flag: '🇲🇭' },
    { code: '+850', country: 'North Korea', flag: '🇰🇵' },
    { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
    { code: '+853', country: 'Macau', flag: '🇲🇴' },
    { code: '+855', country: 'Cambodia', flag: '🇰🇭' },
    { code: '+856', country: 'Laos', flag: '🇱🇦' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+886', country: 'Taiwan', flag: '🇹🇼' },
    { code: '+960', country: 'Maldives', flag: '🇲🇻' },
    { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
    { code: '+962', country: 'Jordan', flag: '🇯🇴' },
    { code: '+963', country: 'Syria', flag: '🇸🇾' },
    { code: '+964', country: 'Iraq', flag: '🇮🇶' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+967', country: 'Yemen', flag: '🇾🇪' },
    { code: '+968', country: 'Oman', flag: '🇴🇲' },
    { code: '+970', country: 'Palestine', flag: '🇵🇸' },
    { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
    { code: '+972', country: 'Israel', flag: '🇮🇱' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+975', country: 'Bhutan', flag: '🇧🇹' },
    { code: '+976', country: 'Mongolia', flag: '🇲🇳' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵' },
    { code: '+992', country: 'Tajikistan', flag: '🇹🇯' },
    { code: '+993', country: 'Turkmenistan', flag: '🇹🇲' },
    { code: '+994', country: 'Azerbaijan', flag: '🇦🇿' },
    { code: '+995', country: 'Georgia', flag: '🇬🇪' },
    { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬' },
    { code: '+998', country: 'Uzbekistan', flag: '🇺🇿' },
  ];

  const filteredCountryCodes = searchQuery
    ? countryCodes.filter(
        (item) =>
          item.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.code.includes(searchQuery)
      )
    : countryCodes;

  const getStepTitle = () => {
    switch (currentStep) {
      case 'username':
        return 'Choose a username';
      case 'email':
        return 'What\'s your email?';
      case 'phone':
        return 'Add your phone number';
      case 'password':
        return 'Create a password';
      case 'confirmPassword':
        return 'Confirm your password';
      default:
        return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'username':
        return 'Pick a unique username for your account';
      case 'email':
        return 'We\'ll send you a verification email';
      case 'phone':
        return 'Optional - helps friends find you';
      case 'password':
        return 'Must be at least 6 characters';
      case 'confirmPassword':
        return 'Enter your password again to confirm';
      default:
        return '';
    }
  };

  const getStepProgress = () => {
    const steps: RegistrationStep[] = ['username', 'email', 'phone', 'password', 'confirmPassword'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const validateUsername = (value: string) => {
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const validatePhone = (value: string) => {
    // Phone is optional, so empty is valid
    if (!value) return null;
    
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return 'Please enter a valid phone number (7-15 digits)';
    }
    return null;
  };

  const formatPhoneForBackend = (countryCode: string, phoneNumber: string) => {
    // Remove all non-digit characters from phone number
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    // Combine country code and phone number
    return `${countryCode}${digitsOnly}`;
  };

  const checkEmailAvailability = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  };

  const checkUsernameAvailability = async (userid: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/auth/check-userid?userid=${encodeURIComponent(userid)}`
      );
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const checkPhoneAvailability = async (phone: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/auth/check-phone?phone_number=${encodeURIComponent(phone)}`
      );
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking phone availability:', error);
      return false;
    }
  };

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const validateConfirmPassword = (value: string) => {
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleNext = async () => {
    setError('');
    setCheckingAvailability(true);
    
    try {
      switch (currentStep) {
        case 'username':
          const usernameError = validateUsername(username);
          if (usernameError) {
            setError(usernameError);
            return;
          }
          
          // Check username availability (lowercase for consistency)
          const usernameAvailable = await checkUsernameAvailability(username.toLowerCase().trim());
          if (!usernameAvailable) {
            setError('This username is already taken. Please choose another one.');
            return;
          }
          
          setCurrentStep('email');
          break;
          
        case 'email':
          const emailError = validateEmail(email);
          if (emailError) {
            setError(emailError);
            return;
          }
          
          // Check email availability (lowercase for consistency)
          const emailAvailable = await checkEmailAvailability(email.toLowerCase().trim());
          if (!emailAvailable) {
            setError('This email is already registered. Please use another email or login.');
            return;
          }
          
          setCurrentStep('phone');
          break;
          
        case 'phone':
          const phoneError = validatePhone(phoneNumber);
          if (phoneError) {
            setError(phoneError);
            return;
          }
          
          // Check phone availability if phone number is provided
          if (phoneNumber) {
            const formattedPhone = formatPhoneForBackend(countryCode, phoneNumber);
            const phoneAvailable = await checkPhoneAvailability(formattedPhone);
            if (!phoneAvailable) {
              setError('This phone number is already registered. Please use another number.');
              return;
            }
          }
          
          setCurrentStep('password');
          break;
          
        case 'password':
          const passwordError = validatePassword(password);
          if (passwordError) {
            setError(passwordError);
            return;
          }
          setCurrentStep('confirmPassword');
          break;
          
        case 'confirmPassword':
          const confirmError = validateConfirmPassword(confirmPassword);
          if (confirmError) {
            setError(confirmError);
            return;
          }
          handleRegister();
          break;
      }
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBack = () => {
    setError('');
    
    switch (currentStep) {
      case 'email':
        setCurrentStep('username');
        break;
      case 'phone':
        setCurrentStep('email');
        break;
      case 'password':
        setCurrentStep('phone');
        break;
      case 'confirmPassword':
        setCurrentStep('password');
        break;
      case 'username':
        router.back();
        break;
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    // Lowercase email and username for consistency (password stays case-sensitive)
    const formattedPhone = phoneNumber ? formatPhoneForBackend(countryCode, phoneNumber) : undefined;
    const registerResult = await authService.register(
      email.toLowerCase().trim(), 
      password, 
      username.toLowerCase().trim(), 
      formattedPhone
    );
    
    setLoading(false);

    if (registerResult.success) {
      router.push('/(auth)/verify-email');
    } else {
      switch (registerResult.errorCode) {
        case 'AUTH_EMAIL_ALREADY_EXISTS':
          setError('This email is already registered');
          setCurrentStep('email');
          break;
        case 'AUTH_USERID_ALREADY_EXISTS':
          setError('This username is already taken');
          setCurrentStep('username');
          break;
        case 'AUTH_PHONE_ALREADY_EXISTS':
          setError('This phone number is already registered');
          setCurrentStep('phone');
          break;
        default:
          setError(registerResult.error || 'Registration failed. Please try again.');
      }
    }
  };

  const handleSkipPhone = () => {
    setPhoneNumber('');
    setError('');
    setCurrentStep('password');
  };

  const getCurrentValue = () => {
    switch (currentStep) {
      case 'username':
        return username;
      case 'email':
        return email;
      case 'phone':
        return phoneNumber;
      case 'password':
        return password;
      case 'confirmPassword':
        return confirmPassword;
      default:
        return '';
    }
  };

  const handleInputChange = (value: string) => {
    setError('');
    
    switch (currentStep) {
      case 'username':
        setUsername(value.replace(/[^a-zA-Z0-9_]/g, ''));
        break;
      case 'email':
        setEmail(value);
        break;
      case 'phone':
        setPhoneNumber(value.replace(/[^\d\s-+()]/g, ''));
        break;
      case 'password':
        setPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
    }
  };

  const getInputIcon = () => {
    switch (currentStep) {
      case 'username':
        return 'person-outline';
      case 'email':
        return 'mail-outline';
      case 'phone':
        return 'call-outline';
      case 'password':
      case 'confirmPassword':
        return 'key-outline';
      default:
        return 'person-outline';
    }
  };

  const getKeyboardType = () => {
    switch (currentStep) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const isPasswordStep = currentStep === 'password' || currentStep === 'confirmPassword';
  const showPasswordToggle = isPasswordStep;
  const isSecureEntry = currentStep === 'password' ? !showPassword : !showConfirmPassword;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getStepProgress()}%` }]} />
          </View>
        </View>

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
            
            {/* Title */}
            <Text style={styles.title}>{getStepTitle()}</Text>
            
            {/* Subtitle */}
            <Text style={styles.subtitle}>{getStepSubtitle()}</Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input Field */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                {currentStep === 'phone' ? (
                  // Phone input with country code picker
                  <>
                    <View style={styles.phoneContainer}>
                      <TouchableOpacity 
                        style={styles.countryCodePicker}
                        onPress={() => setShowCountryPicker(true)}
                        disabled={loading}
                      >
                        <Text style={styles.countryCodeText}>{countryCode}</Text>
                        <Ionicons name="chevron-down" size={16} color="#666666" />
                      </TouchableOpacity>
                      <View style={styles.phoneInputWrapper}>
                        <Ionicons name="call-outline" size={18} color="#A4A4A4" style={styles.inputIcon} />
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="123 456 7890"
                          placeholderTextColor="#525252"
                          value={phoneNumber}
                          onChangeText={(text) => {
                            setError('');
                            // Only allow digits, spaces, and dashes
                            const cleaned = text.replace(/[^\d\s-]/g, '');
                            setPhoneNumber(cleaned);
                          }}
                          keyboardType="phone-pad"
                          editable={!loading}
                          maxLength={20}
                        />
                      </View>
                    </View>
                    {phoneNumber.length > 0 && (
                      <Text style={styles.phonePreview}>
                        {validatePhone(phoneNumber) ? '✗' : '✓'} Final format: {formatPhoneForBackend(countryCode, phoneNumber)}
                      </Text>
                    )}
                  </>
                ) : (
                  // Regular input for other steps
                  <View style={styles.inputWrapper}>
                    <Ionicons name={getInputIcon()} size={18} color="#A4A4A4" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder=""
                      placeholderTextColor="#525252"
                      value={getCurrentValue()}
                      onChangeText={handleInputChange}
                      autoCapitalize={currentStep === 'email' ? 'none' : 'none'}
                      keyboardType={getKeyboardType()}
                      secureTextEntry={isPasswordStep && isSecureEntry}
                      editable={!loading}
                    />
                    {showPasswordToggle && (
                      <TouchableOpacity
                        onPress={() => {
                          if (currentStep === 'password') {
                            setShowPassword(!showPassword);
                          } else {
                            setShowConfirmPassword(!showConfirmPassword);
                          }
                        }}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={isSecureEntry ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#A4A4A4"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Skip Button for Phone Step */}
              {currentStep === 'phone' && (
                <TouchableOpacity onPress={handleSkipPhone}>
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Section - Next Button */}
        <View style={styles.bottomSection}>
          {loading || checkingAvailability ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C1FF72" style={styles.loader} />
              <Text style={styles.loadingText}>
                {checkingAvailability ? 'Checking availability...' : 'Creating account...'}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleNext}
              >
                <Text style={styles.buttonText}>
                  {currentStep === 'confirmPassword' ? 'Create Account' : 'Continue'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#000000" />
              </TouchableOpacity>

              {/* Login Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/login')}
                style={styles.loginContainer}
              >
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginLink}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowCountryPicker(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowCountryPicker(false);
              setSearchQuery('');
            }}
          />
          <View style={styles.modalPopup}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCountryPicker(false);
                  setSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountryCodes}
              keyExtractor={(item, index) => `${item.code}-${item.country}-${index}`}
              showsVerticalScrollIndicator={true}
              style={styles.countryList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    countryCode === item.code && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryPicker(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{item.country}</Text>
                    <Text style={styles.countryCodeInList}>{item.code}</Text>
                  </View>
                  {countryCode === item.code && (
                    <Ionicons name="checkmark" size={24} color="#C1FF72" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>No countries found</Text>
                  <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C1FF72',
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  skipText: {
    fontSize: 14,
    color: '#707070',
    textAlign: 'center',
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
    marginTop: 5,
  },
  loginText: {
    fontSize: 14,
    color: '#000000',
  },
  loginLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  countryCodePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 90,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  countryCodeText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  phoneInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    height: 46,
    paddingHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: '#525252',
    height: '100%',
  },
  phonePreview: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalPopup: {
    width: '90%',
    maxWidth: 500,
    height: '75%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#000000',
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryItemSelected: {
    backgroundColor: '#f0fff4',
  },
  countryFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  countryCodeInList: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 5,
  },
});

