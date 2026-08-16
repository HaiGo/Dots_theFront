import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Photo } from '../config/api';
import { photoService } from '../services/photoService';

const { width } = Dimensions.get('window');
const SPACING = 2;
const GALLERY_PADDING = 2;
const AVAILABLE_WIDTH = width - GALLERY_PADDING * 2;
// Calculate sizes: large (65%) + spacing + small (35%) = 100%
const LARGE_IMAGE_SIZE = Math.floor((AVAILABLE_WIDTH - SPACING) * 0.45);
const SMALL_IMAGE_WIDTH = AVAILABLE_WIDTH - LARGE_IMAGE_SIZE - SPACING;
const SMALL_IMAGE_HEIGHT = Math.floor((LARGE_IMAGE_SIZE - SPACING) / 2);

// Helper function to clean image URLs
const cleanImageUrl = (url: string) => {
  return url.replace(':443/', '/').replace(':80/', '/');
};

export default function GalleryScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGallery = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }

    const result = await photoService.getGallery();

    if (result.success) {
      setPhotos(result.data || []);
    } else {
      if (result.error?.includes('login')) {
        Alert.alert(
          'Session Expired',
          'Please login again to continue',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to load gallery');
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadGallery();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGallery(true);
  }, []);

  const renderPhotos = () => {
    const renderedPhotos = [];
    let i = 0;

    while (i < photos.length) {
      const groupIndex = Math.floor(i / 3);
      const isLargeOnLeft = groupIndex % 2 === 0;
      
      const largePhoto = photos[i];
      const smallPhoto1 = photos[i + 1];
      const smallPhoto2 = photos[i + 2];

      if (isLargeOnLeft) {
        renderedPhotos.push(
          <View key={`group-${i}`} style={styles.photoGroup}>
            <TouchableOpacity
              style={styles.photoLarge}
              onPress={() => {
                router.push({
                  pathname: '/photo-detail',
                  params: {
                    photoUrl: largePhoto.url,
                    photoId: largePhoto.id,
                    showAllFrames: 'true',
                  },
                });
              }}
            >
              <Image 
                source={{ uri: cleanImageUrl(largePhoto.url) }} 
                style={styles.photoImage}
                resizeMode="cover"
                resizeMethod="resize"
              />
            </TouchableOpacity>

            <View style={styles.smallColumn}>
              {smallPhoto1 && (
                <TouchableOpacity
                  style={styles.photoSmall}
                  onPress={() => {
                    router.push({
                      pathname: '/photo-detail',
                      params: {
                        photoUrl: smallPhoto1.url,
                        photoId: smallPhoto1.id,
                        showAllFrames: 'true',
                      },
                    });
                  }}
                >
                  <Image 
                    source={{ uri: cleanImageUrl(smallPhoto1.url) }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                    resizeMethod="resize"
                  />
                </TouchableOpacity>
              )}
              {smallPhoto2 && (
                <TouchableOpacity
                  style={styles.photoSmall}
                  onPress={() => {
                    router.push({
                      pathname: '/photo-detail',
                      params: {
                        photoUrl: smallPhoto2.url,
                        photoId: smallPhoto2.id,
                        showAllFrames: 'true',
                      },
                    });
                  }}
                >
                  <Image 
                    source={{ uri: cleanImageUrl(smallPhoto2.url) }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                    resizeMethod="resize"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      } else {
        renderedPhotos.push(
          <View key={`group-${i}`} style={styles.photoGroup}>
            <View style={styles.smallColumn}>
              {smallPhoto1 && (
                <TouchableOpacity
                  style={styles.photoSmall}
                  onPress={() => {
                    router.push({
                      pathname: '/photo-detail',
                      params: {
                        photoUrl: smallPhoto1.url,
                        photoId: smallPhoto1.id,
                        showAllFrames: 'true',
                      },
                    });
                  }}
                >
                  <Image 
                    source={{ uri: cleanImageUrl(smallPhoto1.url) }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                    resizeMethod="resize"
                  />
                </TouchableOpacity>
              )}
              {smallPhoto2 && (
                <TouchableOpacity
                  style={styles.photoSmall}
                  onPress={() => {
                    router.push({
                      pathname: '/photo-detail',
                      params: {
                        photoUrl: smallPhoto2.url,
                        photoId: smallPhoto2.id,
                        showAllFrames: 'true',
                      },
                    });
                  }}
                >
                  <Image 
                    source={{ uri: cleanImageUrl(smallPhoto2.url) }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                    resizeMethod="resize"
                  />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.photoLarge}
              onPress={() => {
                router.push({
                  pathname: '/photo-detail',
                  params: {
                    photoUrl: largePhoto.url,
                    photoId: largePhoto.id,
                    showAllFrames: 'true',
                  },
                });
              }}
            >
              <Image 
                source={{ uri: cleanImageUrl(largePhoto.url) }} 
                style={styles.photoImage}
                resizeMode="cover"
                resizeMethod="resize"
              />
            </TouchableOpacity>
          </View>
        );
      }

      i += 3;
    }

    return renderedPhotos;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#C1FF72" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Gallery</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Gallery Content */}
      <ScrollView
        style={styles.galleryScroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C1FF72"
          />
        }
      >
        {photos.length === 0 ? (
          <View style={styles.emptyGallery}>
            <Ionicons name="images-outline" size={80} color="#999" />
            <Text style={styles.emptyTitle}>No Photos Yet</Text>
            <Text style={styles.emptyText}>
              Photos you capture will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.galleryGrid}>
            {renderPhotos()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 44,
  },
  galleryScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GALLERY_PADDING,
    paddingBottom: 30,
  },
  galleryGrid: {
    flexDirection: 'column',
  },
  photoGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING,
    width: AVAILABLE_WIDTH,
  },
  photoLarge: {
    width: LARGE_IMAGE_SIZE,
    height: LARGE_IMAGE_SIZE,
    backgroundColor: '#c7c0df',
    borderRadius: 12,
    overflow: 'hidden',
  },
  smallColumn: {
    width: SMALL_IMAGE_WIDTH,
    height: LARGE_IMAGE_SIZE,
    justifyContent: 'space-between',
  },
  photoSmall: {
    width: '100%',
    height: SMALL_IMAGE_HEIGHT,
    backgroundColor: '#c7c0df',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  emptyGallery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

