import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { photoService } from '../services/photoService';

export default function PhotoCaptureScreen() {
  const { sessionKey, frameFolder } = useLocalSearchParams<{ 
    sessionKey: string;
    frameFolder?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Countdown effect
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      // Animate the number appearing
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Countdown timer
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Countdown finished
      setTimeout(() => {
        setCountdown(null);
        setIsCapturing(false);
      }, 500);
    }
  }, [countdown]);

  const handleTriggerPhoto = async () => {
    if (!sessionKey) {
      Alert.alert('Error', 'No session key found');
      return;
    }

    setLoading(true);
    setMessage('Triggering photo...');

    // Record the time when we trigger the photo
    const triggerTime = new Date().getTime();

    const result = await photoService.triggerPhoto(sessionKey);

    if (result.success) {
      // Start countdown animation
      setIsCapturing(true);
      setCountdown(5);
      setMessage('');

      // Wait for countdown to complete (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      setMessage('Loading your photo...');

      // Retry logic: Try up to 6 times with 2 second intervals
      let latestPhoto = null;
      let previousPhotoUrl: string | null = null;
      
      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          setMessage(`Looking for your photo... (${attempt + 1}/6)`);
        }

        const galleryResult = await photoService.getGallery();

        if (galleryResult.success && galleryResult.data && galleryResult.data.length > 0) {
          // Sort photos by created_at timestamp (most recent first)
          const sortedPhotos = [...galleryResult.data].sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          // Get the most recent photo
          const mostRecentPhoto = sortedPhotos[0];
          const photoTime = new Date(mostRecentPhoto.created_at).getTime();
          const currentTime = new Date().getTime();
          
          // Check if this is a NEW photo (different URL from previous check)
          if (attempt > 0 && previousPhotoUrl && mostRecentPhoto.url !== previousPhotoUrl) {
            // We found a new photo!
            latestPhoto = mostRecentPhoto;
            console.log(`Found NEW photo! URL changed from previous attempt`);
            break;
          }
          
          // Store current photo URL for next iteration
          previousPhotoUrl = mostRecentPhoto.url;
          
          // Also check timestamp: Photo should be very recent (within last 20 seconds)
          // Allow for clock differences up to 5 seconds
          const timeSinceTrigger = currentTime - triggerTime;
          const timeDiff = photoTime - triggerTime;
          
          if (timeDiff > -5000 && timeSinceTrigger < 20000) {
            // Photo timestamp is reasonable, use it
            if (attempt >= 2) { // Give it at least 2 attempts (10+ seconds total)
              latestPhoto = mostRecentPhoto;
              console.log(`Found photo after ${attempt + 1} attempts! Time diff: ${timeDiff}ms`);
              break;
            }
          }
          
          console.log(`Attempt ${attempt + 1}: Trigger: ${new Date(triggerTime).toISOString()}, Photo: ${mostRecentPhoto.created_at}, Diff: ${timeDiff}ms, URL: ${mostRecentPhoto.url.substring(0, 50)}...`);
          
          // If this is the last attempt, use whatever we have
          if (attempt === 5) {
            console.log('Last attempt - using most recent photo');
            latestPhoto = mostRecentPhoto;
          }
        }
      }

      if (latestPhoto) {
        // Navigate to photo detail screen with frame editor
        // If frameFolder exists and is not empty, use it; otherwise show all frames
        const hasFrameFolder = frameFolder && frameFolder.trim() !== '';
        
        router.replace({
          pathname: '/photo-detail',
          params: {
            photoUrl: latestPhoto.url,
            frameFolder: hasFrameFolder ? frameFolder : '',
            showAllFrames: hasFrameFolder ? 'false' : 'true',
          },
        });
      } else {
        // If we can't get the photo, just go back to gallery
        router.replace('/(tabs)');
        setTimeout(() => {
          Alert.alert('Success!', 'Your photo has been captured!');
        }, 500);
      }
    } else {
      setLoading(false);
      setMessage('');
      
      Alert.alert(
        'Photo Capture Failed',
        result.error || 'Unable to capture photo',
        [
          {
            text: 'Try Again',
            onPress: () => setMessage(''),
          },
          {
            text: 'Scan New QR',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Capture</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          <Text style={styles.statusTitle}>Connected to Booth!</Text>
          <Text style={styles.statusSubtitle}>
            You're ready to capture your photo
          </Text>
        </View>

        {/* Countdown Animation */}
        {isCapturing && countdown !== null && countdown > 0 ? (
          <View style={styles.countdownContainer}>
            <Animated.View
              style={[
                styles.countdownCircle,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              <Text style={styles.countdownText}>{countdown}</Text>
            </Animated.View>
          </View>
        ) : message ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" color="#C1FF72" />
            <Text style={styles.message}>{message}</Text>
          </View>
        ) : null}

        {!loading ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={handleTriggerPhoto}>
              <Ionicons name="camera" size={40} color="#000000" />
              <Text style={styles.captureButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Tap the button to capture your photo
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
    marginBottom: 10,
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(193, 255, 114, 0.2)',
    borderWidth: 4,
    borderColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C1FF72',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  countdownText: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: '#C1FF72',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  messageContainer: {
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    color: '#666666',
    marginTop: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
  },
  hint: {
    fontSize: 14,
    color: '#999999',
    marginTop: 20,
    textAlign: 'center',
  },
});

