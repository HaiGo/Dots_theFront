import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { parseQRCode } from '../../config/api';
import { photoService } from '../../services/photoService';

// ========== CAMERA MODULE LOGGING ==========
console.log('=== CAMERA SCREEN MODULE LOADING ===');
console.log('📱 App Ownership:', Constants.appOwnership);
console.log('📱 Is Expo Go?:', Constants.appOwnership === 'expo');
console.log('📷 Camera module available?:', typeof CameraView !== 'undefined');
console.log('📷 useCameraPermissions available?:', typeof useCameraPermissions !== 'undefined');
console.log('=== END CAMERA MODULE LOADING ===\n');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'qr'>('photo');
  const cameraRef = useRef<CameraView>(null);

  // Reset scanner state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setScanning(false);
      setProcessing(false);
      setCameraMode('photo'); // Default to photo mode
      return () => {
        // Cleanup
        setScanning(false);
        setProcessing(false);
      };
    }, [])
  );

  const takePicture = async () => {
    if (cameraRef.current && !processing) {
      setProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo) {
          // Navigate to photo detail with the captured image and enable all frames
          router.push({
            pathname: '/photo-detail',
            params: {
              photoUrl: photo.uri,
              showAllFrames: 'true', // Enable frame selection
            },
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      } finally {
        setProcessing(false);
      }
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#C1FF72" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionMessage}>
            Dots needs camera access to scan QR codes
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || processing || cameraMode !== 'qr') return;
    
    setScanning(false);
    setProcessing(true);

    try {
      // Parse QR code: "dots://link?session=ABC123&frame_folder=birthday"
      const qrData = parseQRCode(data);

      if (!qrData || !qrData.session_key) {
        Alert.alert('Invalid QR Code', 'This QR code is not valid for Dots');
        setScanning(true);
        setProcessing(false);
        return;
      }

      // Link session
      const result = await photoService.startSession(qrData.session_key);

      if (result.success) {
        // Navigate to photo capture screen with session key and frame folder
        router.push({
          pathname: '/photo-capture',
          params: { 
            sessionKey: qrData.session_key,
            frameFolder: qrData.frame_folder || '',
          },
        });
      } else {
        Alert.alert('Connection Failed', result.error || 'Unable to connect to booth', [
          {
            text: 'Try Again',
            onPress: () => {
              setScanning(true);
              setProcessing(false);
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Please scan a valid Dots QR code', [
        {
          text: 'Try Again',
          onPress: () => {
            setScanning(true);
            setProcessing(false);
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        key={cameraMode}
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onBarcodeScanned={cameraMode === 'qr' && scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={
          cameraMode === 'qr'
            ? {
                barcodeTypes: ['qr'],
              }
            : undefined
        }
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('Back button pressed');
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <View style={styles.modeToggleInner}>
            <TouchableOpacity
              style={[styles.modeButton, cameraMode === 'photo' && styles.modeButtonActive]}
              onPress={() => {
                console.log('Photo button pressed');
                setCameraMode('photo');
                setScanning(false);
                setProcessing(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="camera" 
                size={20} 
                color={cameraMode === 'photo' ? '#000' : '#999'} 
              />
              <Text style={[styles.modeText, cameraMode === 'photo' && styles.modeTextActive]}>
                Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, cameraMode === 'qr' && styles.modeButtonActive]}
              onPress={() => {
                console.log('QR button pressed');
                setCameraMode('qr');
                setScanning(true);
                setProcessing(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="qr-code" 
                size={20} 
                color={cameraMode === 'qr' ? '#000' : '#999'} 
              />
              <Text style={[styles.modeText, cameraMode === 'qr' && styles.modeTextActive]}>
                QR Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Content - positioned below toggle */}
        <View style={styles.cameraContent} key={cameraMode}>
        {cameraMode === 'qr' ? (
          // QR Code Scanning UI
          <View style={styles.fullContent} key="qr-mode">
            <View style={styles.topOverlay}>
              <Text style={styles.title}>Scan QR Code</Text>
              <Text style={styles.subtitle}>Point camera at Dots QR code</Text>
            </View>

            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            <View style={styles.bottomOverlay}>
              {processing && (
                <Text style={styles.processingText}>Connecting to booth...</Text>
              )}
            </View>
          </View>
        ) : (
          // Photo Capture UI
          <View style={styles.fullContent} key="photo-mode">
            <View style={styles.topTextArea}>
              <Text style={styles.title}>Take a Photo</Text>
              <Text style={styles.subtitle}>Capture your moment</Text>
            </View>

            <View style={styles.centerArea} />

            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                disabled={processing}
                activeOpacity={0.7}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              {processing && (
                <Text style={styles.processingText}>Capturing...</Text>
              )}
            </View>
          </View>
        )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#000000',
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#C1FF72',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    zIndex: 300,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topOverlay: {
    minHeight: 120,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  topTextArea: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanArea: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    position: 'relative',
    marginVertical: 'auto',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomOverlay: {
    minHeight: 140,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  processingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 15,
  },
  modeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 80,
    right: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 250,
    elevation: 10,
    pointerEvents: 'box-none',
  },
  modeToggleInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 25,
    padding: 4,
    pointerEvents: 'auto',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#C1FF72',
  },
  modeText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#000',
  },
  cameraContent: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 115 : 105,
    justifyContent: 'space-between',
  },
  fullContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerArea: {
    flex: 1,
  },
  bottomControls: {
    minHeight: 140,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});

