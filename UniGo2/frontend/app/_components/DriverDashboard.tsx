import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { GlassContainer } from './GlassContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../_constants/theme';
import { useAppStore, RideBroadcast, CampusReward, PublishedRoute } from '../_store/appStore';
import { DriverRoute, RideRequest as ApiRideRequest, PickupPoint } from '../_services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Campus rewards available for redemption
const CAMPUS_REWARDS: CampusReward[] = [
  { id: 'r1', name: 'Free Coffee', description: 'Get a free coffee from campus café', pointsCost: 50, category: 'snacks', icon: 'cafe', available: true },
  { id: 'r2', name: 'Snack Pack', description: 'Chips, cookies & drink combo', pointsCost: 75, category: 'snacks', icon: 'fast-food', available: true },
  { id: 'r3', name: '₹100 Book Voucher', description: 'Discount at campus bookstore', pointsCost: 150, category: 'books', icon: 'book', available: true },
  { id: 'r4', name: 'Premium Notebook', description: '200-page ruled notebook', pointsCost: 100, category: 'stationery', icon: 'document-text', available: true },
  { id: 'r5', name: 'Pen Set', description: 'Set of 5 premium pens', pointsCost: 80, category: 'stationery', icon: 'pencil', available: true },
  { id: 'r6', name: 'Lunch Special', description: 'Free lunch at campus canteen', pointsCost: 200, category: 'snacks', icon: 'restaurant', available: true },
];

// Common pickup points in Bangalore
const COMMON_PICKUP_POINTS = [
  { name: 'Indiranagar Metro', landmark: 'Near 100ft Road' },
  { name: 'Koramangala BDA Complex', landmark: 'Near Forum Mall' },
  { name: 'MG Road Metro', landmark: 'Exit Gate 1' },
  { name: 'Silk Board Junction', landmark: 'Near Flyover' },
  { name: 'Marathahalli Bridge', landmark: 'Near ORR' },
  { name: 'Whitefield ITPL', landmark: 'Near Main Gate' },
  { name: 'Electronic City Toll', landmark: 'Near Phase 1' },
  { name: 'HSR Layout BDA', landmark: 'Sector 7' },
  { name: 'Bellandur Gate', landmark: 'Near Signal' },
  { name: 'Sarjapur Road Junction', landmark: 'Near Total Mall' },
];

// Sample pending ride requests
const SAMPLE_PENDING_REQUESTS: ApiRideRequest[] = [
  {
    id: 'req-1',
    rider_id: 'rider-1',
    rider_name: 'Sneha Reddy',
    driver_id: 'driver-1',
    driver_name: 'You',
    route_id: 'route-1',
    pickup_location: 'Koramangala BDA Complex',
    pickup_time: '8:20 AM',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'req-2',
    rider_id: 'rider-2',
    rider_name: 'Vikram Singh',
    driver_id: 'driver-1',
    driver_name: 'You',
    route_id: 'route-1',
    pickup_location: 'HSR Layout BDA',
    pickup_time: '8:35 AM',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
];

export const DriverDashboard: React.FC = () => {
  const { user, publishRoute, removeRoute, setVehicle, setDrivingLicenseUploaded, addCampusPoints, spendCampusPoints, broadcastRide } = useAppStore();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('NHCE Campus Gate A');
  const [departureTime, setDepartureTime] = useState('8:30 AM');
  const [availableSeats, setAvailableSeats] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState(50);
  const [selectedPickups, setSelectedPickups] = useState<PickupPoint[]>([]);
  const [showPickupSelector, setShowPickupSelector] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [myActiveRoute, setMyActiveRoute] = useState<DriverRoute | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ApiRideRequest[]>(SAMPLE_PENDING_REQUESTS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Vehicle info state
  const [vehicleMake, setVehicleMake] = useState(user?.vehicle?.make || '');
  const [vehicleModel, setVehicleModel] = useState(user?.vehicle?.model || '');
  const [vehicleColor, setVehicleColor] = useState(user?.vehicle?.color || '');
  const [vehicleYear, setVehicleYear] = useState(user?.vehicle?.year || '');
  const [showLicenseUpload, setShowLicenseUpload] = useState(false);
  const [licenseImage, setLicenseImage] = useState<string | null>(user?.drivingLicenseImage || null);

  // Rewards section
  const [showRewards, setShowRewards] = useState(false);

  // QR Code display
  const [showQRModal, setShowQRModal] = useState(false);

  const driverStreak = 12;
  const totalRides = 47;
  const rating = 4.8;
  const campusPoints = user?.campusPoints || 0;

  // Pick image from gallery
  const pickLicenseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload your driving license.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLicenseImage(result.assets[0].uri);
    }
  };

  // Take photo with camera
  const takeLicensePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera to take a photo of your driving license.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLicenseImage(result.assets[0].uri);
    }
  };

  // Redeem reward
  const handleRedeemReward = (reward: CampusReward) => {
    if (campusPoints < reward.pointsCost) {
      Alert.alert('Insufficient Points', `You need ${reward.pointsCost - campusPoints} more points to redeem this reward.`);
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Spend ${reward.pointsCost} points for "${reward.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: () => {
            if (spendCampusPoints(reward.pointsCost)) {
              Alert.alert('🎉 Redeemed!', `You've redeemed "${reward.name}". Show this to collect your reward at the campus store.`);
            }
          }
        },
      ]
    );
  };

  // Broadcast departure notification
  const handleBroadcastDeparture = () => {
    if (!myActiveRoute) {
      Alert.alert('No Active Route', 'Please publish a route first before broadcasting.');
      return;
    }

    const broadcast: RideBroadcast = {
      id: `broadcast-${Date.now()}`,
      driver_id: user?.id || 'driver-1',
      driver_name: user?.name || 'Driver',
      origin: myActiveRoute.origin,
      destination: myActiveRoute.destination,
      departure_time: myActiveRoute.departure_time,
      available_seats: myActiveRoute.available_seats,
      vehicle: user?.vehicle,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Expires in 30 minutes
    };

    broadcastRide(broadcast);
    Alert.alert('📣 Broadcast Sent!', 'All riders have been notified that you\'re leaving campus. They can see your ride in the notifications.');
  };

  // Simulate refresh (no API call)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    // Reset sample requests
    setPendingRequests(SAMPLE_PENDING_REQUESTS);
    setRefreshing(false);
  }, []);

  // Add pickup point
  const addPickupPoint = (point: { name: string; landmark?: string }) => {
    // Calculate estimated time based on departure and position
    const baseHour = parseInt(departureTime.split(':')[0]) || 8;
    const baseMin = parseInt(departureTime.split(':')[1]?.split(' ')[0]) || 30;
    const estimatedMinutes = baseMin - (selectedPickups.length + 1) * 10;
    const adjustedHour = estimatedMinutes < 0 ? baseHour - 1 : baseHour;
    const adjustedMin = estimatedMinutes < 0 ? 60 + estimatedMinutes : estimatedMinutes;
    const period = adjustedHour >= 12 ? 'PM' : 'AM';
    const displayHour = adjustedHour > 12 ? adjustedHour - 12 : adjustedHour;

    const newPickup: PickupPoint = {
      id: `pickup-${Date.now()}`,
      name: point.name,
      landmark: point.landmark,
      estimatedTime: `${displayHour}:${adjustedMin.toString().padStart(2, '0')} ${period}`,
    };

    setSelectedPickups([...selectedPickups, newPickup]);
    setShowPickupSelector(false);
  };

  // Remove pickup point
  const removePickupPoint = (id: string) => {
    setSelectedPickups(selectedPickups.filter(p => p.id !== id));
  };

  // Publish route (mock - no API call)
  const handlePublishRoute = async () => {
    if (!origin || !departureTime) {
      Alert.alert('Missing Info', 'Please fill in your starting location and departure time');
      return;
    }

    if (selectedPickups.length === 0) {
      Alert.alert('Add Pickups', 'Please add at least one pickup point for riders');
      return;
    }

    setIsPublishing(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Create mock route
    const mockRoute: DriverRoute = {
      id: `route-${Date.now()}`,
      driver_id: user?.id || 'driver-1',
      driver_name: user?.name || 'Driver',
      origin,
      destination,
      departure_time: departureTime,
      direction: 'to_college',
      available_seats: availableSeats,
      price_per_seat: pricePerSeat,
      amenities: ['AC', 'Music'],
      pickup_points: selectedPickups,
      is_active: true,
      created_at: new Date().toISOString(),
      vehicle: user?.vehicle,
    };

    setMyActiveRoute(mockRoute);

    // Add to shared store so riders can see it
    publishRoute(mockRoute as unknown as PublishedRoute);

    setIsPublishing(false);

    Alert.alert('🎉 Route Published!', 'Your route is now live! Riders can see your pickup points and request rides.');

    // Reset form
    setOrigin('');
    setSelectedPickups([]);
  };

  // Accept ride request (mock - no API call)
  const handleAcceptRequest = async (request: ApiRideRequest) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Remove from pending requests
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));

    // Award campus points for accepting ride
    addCampusPoints(25);

    Alert.alert(
      '✅ Ride Accepted!',
      `You accepted ${request.rider_name}'s ride request.\n\n📍 Pickup: ${request.pickup_location}\n⏰ Time: ${request.pickup_time}\n\n🌟 +25 Campus Points earned!\n\nThey will be waiting at the pickup point.`
    );
  };

  // Reject ride request (mock - no API call)
  const handleRejectRequest = async (request: ApiRideRequest) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Remove from pending requests
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
  };

  // Deactivate route (mock - no API call)
  const handleDeactivateRoute = async () => {
    if (!myActiveRoute) return;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));

    // Remove from shared store
    removeRoute(myActiveRoute.id);

    setMyActiveRoute(null);
    Alert.alert('🛑 Route Cancelled', 'Your route has been deactivated. You can publish a new one anytime.');
  };

  // Show loading or placeholder if no user
  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <Ionicons name="car" size={64} color={COLORS.orange} />
        <Text style={{ color: COLORS.white, fontSize: 18, marginTop: 16 }}>Welcome, Driver!</Text>
        <Text style={{ color: COLORS.whiteAlpha60, fontSize: 14, marginTop: 8 }}>Complete onboarding to start driving</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
        }
      >
        {/* Driver Profile & Stats */}
        <GlassContainer style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color={COLORS.emeraldGreen} />
              <View style={styles.eliteBadge}>
                <Ionicons name="star" size={16} color={COLORS.warning} />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Elite Host'}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={18} color={COLORS.warning} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                <Text style={styles.rideCount}>• {totalRides} rides</Text>
              </View>
            </View>
          </View>

          {/* Incentive Tracker */}
          <View style={styles.incentiveSection}>
            <View style={styles.incentiveHeader}>
              <Text style={styles.incentiveTitle}>VIP Campus Parking Progress</Text>
              <Text style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color={COLORS.warning} />
                {' '}{driverStreak} day streak
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(driverStreak / 30) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{driverStreak}/30 days to unlock VIP parking</Text>
          </View>
        </GlassContainer>

        {/* Campus Points Section */}
        <GlassContainer style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View style={styles.pointsInfo}>
              <LinearGradient
                colors={[COLORS.orange, '#E67E22']}
                style={styles.pointsIconBg}
              >
                <Ionicons name="star" size={24} color={COLORS.white} />
              </LinearGradient>
              <View>
                <Text style={styles.pointsLabel}>Campus Points</Text>
                <Text style={styles.pointsValue}>{campusPoints}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.rewardsButton}
              onPress={() => setShowRewards(!showRewards)}
            >
              <Ionicons name="gift" size={20} color={COLORS.orange} />
              <Text style={styles.rewardsButtonText}>Rewards</Text>
              <Ionicons name={showRewards ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.orange} />
            </TouchableOpacity>
          </View>

          <View style={styles.pointsEarnInfo}>
            <Ionicons name="information-circle" size={16} color={COLORS.emeraldGreen} />
            <Text style={styles.earnInfoText}>Earn 25 points for every completed ride!</Text>
          </View>

          {/* Rewards Section */}
          {showRewards && (
            <View style={styles.rewardsSection}>
              <Text style={styles.rewardsTitle}>Redeem Your Points</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rewardsList}>
                {CAMPUS_REWARDS.map((reward) => (
                  <TouchableOpacity
                    key={reward.id}
                    style={[
                      styles.rewardCard,
                      campusPoints < reward.pointsCost && styles.rewardCardDisabled,
                    ]}
                    onPress={() => handleRedeemReward(reward)}
                  >
                    <LinearGradient
                      colors={
                        reward.category === 'snacks' ? ['#FF6B6B', '#EE5A5A'] :
                          reward.category === 'books' ? ['#4ECDC4', '#45B7AA'] :
                            ['#9B59B6', '#8E44AD']
                      }
                      style={styles.rewardIconBg}
                    >
                      <Ionicons name={reward.icon as any} size={24} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.rewardName}>{reward.name}</Text>
                    <Text style={styles.rewardDesc} numberOfLines={2}>{reward.description}</Text>
                    <View style={styles.rewardCost}>
                      <Ionicons name="star" size={14} color={COLORS.warning} />
                      <Text style={styles.rewardCostText}>{reward.pointsCost} pts</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </GlassContainer>

        {/* Driver Verification Section - Only show if not verified */}
        {!user?.drivingLicenseUploaded && (
          <GlassContainer style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Ionicons name="shield-checkmark" size={28} color={COLORS.orange} />
              <View style={styles.verificationTitles}>
                <Text style={styles.verificationTitle}>Become a Verified Driver</Text>
                <Text style={styles.verificationSubtitle}>Upload documents to start driving</Text>
              </View>
            </View>

            {!showLicenseUpload ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => setShowLicenseUpload(true)}
              >
                <Ionicons name="document-text" size={20} color={COLORS.white} />
                <Text style={styles.uploadButtonText}>Upload Documents</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.uploadForm}>
                <Text style={styles.formLabel}>Driving License *</Text>
                {licenseImage ? (
                  <View style={styles.licensePreview}>
                    <Image source={{ uri: licenseImage }} style={styles.licenseImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setLicenseImage(null)}
                    >
                      <Ionicons name="close-circle" size={28} color={COLORS.error} />
                    </TouchableOpacity>
                    <View style={styles.verifyingBadge}>
                      <Ionicons name="hourglass" size={14} color={COLORS.warning} />
                      <Text style={styles.verifyingText}>Will be verified</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadOptions}>
                    <TouchableOpacity style={styles.fileUploadBox} onPress={pickLicenseImage}>
                      <Ionicons name="images" size={32} color={COLORS.orange} />
                      <Text style={styles.fileUploadText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fileUploadBox} onPress={takeLicensePhoto}>
                      <Ionicons name="camera" size={32} color={COLORS.orange} />
                      <Text style={styles.fileUploadText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.formLabel}>Vehicle Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Make (e.g., Maruti Suzuki)"
                  placeholderTextColor={COLORS.whiteAlpha40}
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Model (e.g., Swift)"
                  placeholderTextColor={COLORS.whiteAlpha40}
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                />
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Color"
                    placeholderTextColor={COLORS.whiteAlpha40}
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Year"
                    placeholderTextColor={COLORS.whiteAlpha40}
                    value={vehicleYear}
                    onChangeText={setVehicleYear}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, (!licenseImage || !vehicleMake || !vehicleModel) && styles.submitButtonDisabled]}
                  disabled={!licenseImage || !vehicleMake || !vehicleModel}
                  onPress={() => {
                    if (!licenseImage) {
                      Alert.alert('Error', 'Please upload your driving license photo');
                      return;
                    }
                    if (!vehicleMake || !vehicleModel) {
                      Alert.alert('Error', 'Please fill in vehicle make and model');
                      return;
                    }
                    // Save vehicle info and mark as pending verification
                    setVehicle({
                      make: vehicleMake,
                      model: vehicleModel,
                      color: vehicleColor,
                      year: vehicleYear,
                    });
                    setDrivingLicenseUploaded(true, licenseImage);
                    setShowLicenseUpload(false);
                    // Add bonus points for signing up as driver
                    addCampusPoints(100);
                    Alert.alert(
                      '✅ Documents Submitted!',
                      'Your license is pending verification. You can start publishing routes now.\n\n🎉 +100 Campus Points for becoming a driver!'
                    );
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Submit for Verification</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassContainer>
        )}

        {/* Vehicle Info Card - Show if verified */}
        {user?.drivingLicenseUploaded && user?.vehicle && (
          <GlassContainer style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleIconBox}>
                <Ionicons name="car-sport" size={28} color={COLORS.orange} />
              </View>
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehicleName}>{user.vehicle.make} {user.vehicle.model}</Text>
                <Text style={styles.vehicleSubtext}>{user.vehicle.color} • {user.vehicle.year}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </GlassContainer>
        )}

        {/* Active Route Status */}
        {myActiveRoute && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Active Route</Text>
            <GlassContainer style={styles.activeRouteCard}>
              <View style={styles.activeRouteHeader}>
                <View style={styles.statusBadge}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.statusText}>LIVE</Text>
                </View>
                <TouchableOpacity onPress={handleDeactivateRoute} style={styles.cancelButton}>
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={18} color={COLORS.emeraldGreen} />
                  <Text style={styles.routeText}>{myActiveRoute.origin}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <Ionicons name="flag" size={18} color={COLORS.orange} />
                  <Text style={styles.routeText}>{myActiveRoute.destination}</Text>
                </View>
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="time" size={16} color={COLORS.whiteAlpha60} />
                  <Text style={styles.infoText}>{myActiveRoute.departure_time}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="people" size={16} color={COLORS.whiteAlpha60} />
                  <Text style={styles.infoText}>{myActiveRoute.available_seats} seats</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.priceText}>₹{myActiveRoute.price_per_seat}/seat</Text>
                </View>
              </View>

              {myActiveRoute.pickup_points && myActiveRoute.pickup_points.length > 0 && (
                <View style={styles.pickupsPreview}>
                  <Text style={styles.pickupsLabel}>Pickup Points:</Text>
                  {myActiveRoute.pickup_points.map((pickup, index) => (
                    <View key={pickup.id} style={styles.pickupPreviewItem}>
                      <Text style={styles.pickupNumber}>{index + 1}</Text>
                      <Text style={styles.pickupPreviewText}>{pickup.name} • {pickup.estimatedTime}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Broadcast Departure Button */}
              <TouchableOpacity
                style={styles.broadcastButton}
                onPress={handleBroadcastDeparture}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.broadcastGradient}
                >
                  <Ionicons name="megaphone" size={20} color={COLORS.white} />
                  <Text style={styles.broadcastButtonText}>Notify Riders I'm Leaving</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Show QR Code Button */}
              <TouchableOpacity
                style={styles.showQRButton}
                onPress={() => setShowQRModal(true)}
              >
                <LinearGradient
                  colors={[COLORS.emeraldGreen, '#059669']}
                  style={styles.broadcastGradient}
                >
                  <Ionicons name="qr-code" size={20} color={COLORS.white} />
                  <Text style={styles.broadcastButtonText}>Show QR for Riders</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassContainer>
          </View>
        )}

        {/* Route Publisher - Only show if verified and no active route */}
        {user?.drivingLicenseUploaded && !myActiveRoute && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publish Your Route</Text>
            <Text style={styles.sectionSubtitle}>Set your pickup points for riders to join</Text>

            <GlassContainer style={styles.routeForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Starting Location</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="home" size={20} color={COLORS.emeraldGreen} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Indiranagar"
                    placeholderTextColor={COLORS.whiteAlpha40}
                    value={origin}
                    onChangeText={setOrigin}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Campus Destination</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="school" size={20} color={COLORS.orange} />
                  <TextInput
                    style={styles.input}
                    placeholder="Campus Gate A"
                    placeholderTextColor={COLORS.whiteAlpha40}
                    value={destination}
                    onChangeText={setDestination}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.sm }]}>
                  <Text style={styles.label}>Departure Time</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="time" size={20} color={COLORS.electricBlue} />
                    <TextInput
                      style={styles.input}
                      placeholder="8:30 AM"
                      placeholderTextColor={COLORS.whiteAlpha40}
                      value={departureTime}
                      onChangeText={setDepartureTime}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Seats Available</Text>
                  <View style={styles.seatsContainer}>
                    <TouchableOpacity
                      style={styles.seatButton}
                      onPress={() => setAvailableSeats(Math.max(1, availableSeats - 1))}
                    >
                      <Ionicons name="remove" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.seatsText}>{availableSeats}</Text>
                    <TouchableOpacity
                      style={styles.seatButton}
                      onPress={() => setAvailableSeats(Math.min(6, availableSeats + 1))}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Price per seat */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price per Seat (₹)</Text>
                <View style={styles.priceContainer}>
                  {[30, 50, 75, 100].map((price) => (
                    <TouchableOpacity
                      key={price}
                      style={[
                        styles.priceOption,
                        pricePerSeat === price && styles.priceOptionActive,
                      ]}
                      onPress={() => setPricePerSeat(price)}
                    >
                      <Text style={[
                        styles.priceOptionText,
                        pricePerSeat === price && styles.priceOptionTextActive,
                      ]}>
                        ₹{price}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Pickup Points Section */}
              <View style={styles.pickupsSection}>
                <View style={styles.pickupsHeader}>
                  <Text style={styles.label}>Pickup Points Along Your Route</Text>
                  <TouchableOpacity
                    style={styles.addPickupButton}
                    onPress={() => setShowPickupSelector(true)}
                  >
                    <Ionicons name="add-circle" size={24} color={COLORS.emeraldGreen} />
                    <Text style={styles.addPickupText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {selectedPickups.length === 0 ? (
                  <View style={styles.emptyPickups}>
                    <Ionicons name="location-outline" size={32} color={COLORS.whiteAlpha40} />
                    <Text style={styles.emptyPickupsText}>
                      Add pickup points where riders can join
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pickupsList}>
                    {selectedPickups.map((pickup, index) => (
                      <View key={pickup.id} style={styles.pickupItem}>
                        <View style={styles.pickupLeft}>
                          <View style={styles.pickupNumberBadge}>
                            <Text style={styles.pickupNumberText}>{index + 1}</Text>
                          </View>
                          <View style={styles.pickupDetails}>
                            <Text style={styles.pickupName}>{pickup.name}</Text>
                            <Text style={styles.pickupTime}>
                              <Ionicons name="time-outline" size={12} color={COLORS.emeraldGreen} />
                              {' '}{pickup.estimatedTime}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => removePickupPoint(pickup.id)}>
                          <Ionicons name="close-circle" size={24} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.publishButton, isPublishing && styles.publishButtonDisabled]}
                onPress={handlePublishRoute}
                disabled={isPublishing}
                activeOpacity={0.8}
              >
                {isPublishing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="publish" size={20} color={COLORS.white} />
                    <Text style={styles.publishButtonText}>Publish Route</Text>
                  </>
                )}
              </TouchableOpacity>
            </GlassContainer>
          </View>
        )}

        {/* Pending Ride Requests */}
        {user?.drivingLicenseUploaded && myActiveRoute && pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ride Requests</Text>
            <Text style={styles.sectionSubtitle}>{pendingRequests.length} riders want to join</Text>

            {pendingRequests.map((request) => (
              <GlassContainer key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.riderInfo}>
                    <View style={styles.riderAvatar}>
                      <Ionicons name="person" size={24} color={COLORS.electricBlue} />
                    </View>
                    <View>
                      <Text style={styles.riderName}>{request.rider_name}</Text>
                      <Text style={styles.requestPickup}>
                        <Ionicons name="location" size={12} color={COLORS.emeraldGreen} />
                        {' '}{request.pickup_location}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestTime}>{request.pickup_time || 'Soon'}</Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejectRequest(request)}
                  >
                    <Ionicons name="close" size={20} color={COLORS.error} />
                    <Text style={styles.rejectText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request)}
                  >
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </GlassContainer>
            ))}
          </View>
        )}

        {/* Pickup Point Selector Modal */}
        {showPickupSelector && (
          <View style={styles.modalOverlay}>
            <GlassContainer style={styles.pickupModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Pickup Point</Text>
                <TouchableOpacity onPress={() => setShowPickupSelector(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.pickupOptions}>
                {COMMON_PICKUP_POINTS.filter(
                  p => !selectedPickups.find(sp => sp.name === p.name)
                ).map((point) => (
                  <TouchableOpacity
                    key={point.name}
                    style={styles.pickupOption}
                    onPress={() => addPickupPoint(point)}
                  >
                    <Ionicons name="location" size={20} color={COLORS.emeraldGreen} />
                    <View style={styles.pickupOptionInfo}>
                      <Text style={styles.pickupOptionName}>{point.name}</Text>
                      {point.landmark && (
                        <Text style={styles.pickupOptionLandmark}>{point.landmark}</Text>
                      )}
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.orange} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassContainer>
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Rider Check-in QR</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.whiteAlpha60} />
              </TouchableOpacity>
            </View>

            <Text style={styles.qrModalSubtitle}>
              Show this QR to riders when they enter your vehicle
            </Text>

            <View style={styles.qrCodeContainer}>
              {myActiveRoute && (
                <QRCode
                  value={JSON.stringify({
                    type: 'UNIGO_RIDE',
                    route_id: myActiveRoute.id,
                    driver_id: user?.id || 'driver',
                    driver_name: user?.name || 'Driver',
                    origin: myActiveRoute.origin,
                    destination: myActiveRoute.destination,
                    timestamp: Date.now(),
                  })}
                  size={SCREEN_WIDTH * 0.5}
                  color="#000"
                  backgroundColor="#FFF"
                />
              )}
            </View>

            <View style={styles.qrInfoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.electricBlue} />
              <Text style={styles.qrInfoText}>
                Rider scans this to confirm they've boarded your vehicle
              </Text>
            </View>

            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.qrCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  profileCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eliteBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.slate900,
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  profileName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  rideCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  incentiveSection: {
    marginTop: SPACING.md,
  },
  incentiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  incentiveTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  streakBadge: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    fontWeight: '600' as const,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.slate800,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.emeraldGreen,
  },
  progressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  // Verification section styles
  verificationCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderColor: COLORS.orange,
    borderWidth: 1,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  verificationTitles: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  verificationSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
  },
  uploadForm: {
    gap: SPACING.md,
  },
  formLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  fileUploadBox: {
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSurface,
  },
  fileUploadText: {
    color: COLORS.whiteAlpha60,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
  },
  // Vehicle card styles
  vehicleCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconBox: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cardSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  vehicleName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  vehicleSubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
    gap: SPACING.xs,
  },
  verifiedText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    fontWeight: '600' as const,
  },
  activeRouteCard: {
    marginHorizontal: SPACING.md,
    padding: SPACING.lg,
  },
  activeRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldGreen + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
    gap: SPACING.xs,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.emeraldGreen,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold' as const,
    color: COLORS.emeraldGreen,
  },
  cancelButton: {
    padding: SPACING.xs,
  },
  routeDetails: {
    marginBottom: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.slate700,
    marginLeft: 8,
    marginVertical: SPACING.xs,
  },
  routeText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  priceText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.emeraldGreen,
  },
  pickupsPreview: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  pickupsLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginBottom: SPACING.sm,
  },
  pickupPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  pickupNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.emeraldGreen,
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold' as const,
    textAlign: 'center',
    lineHeight: 20,
  },
  pickupPreviewText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
  },
  requestCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.electricBlue + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderName: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: 2,
  },
  requestPickup: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  requestTime: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600' as const,
    color: COLORS.orange,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  rejectText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.error,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.emeraldGreen,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  acceptButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  routeForm: {
    marginHorizontal: SPACING.md,
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha80,
    marginBottom: SPACING.sm,
    fontWeight: '600' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  seatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  priceContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  priceOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  priceOptionActive: {
    backgroundColor: COLORS.emeraldGreen + '20',
    borderColor: COLORS.emeraldGreen,
  },
  priceOptionText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.whiteAlpha60,
  },
  priceOptionTextActive: {
    color: COLORS.emeraldGreen,
  },
  pickupsSection: {
    marginTop: SPACING.md,
  },
  pickupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addPickupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addPickupText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.emeraldGreen,
    fontWeight: '600' as const,
  },
  emptyPickups: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
  },
  emptyPickupsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha40,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  pickupsList: {
    gap: SPACING.sm,
  },
  pickupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.emeraldGreen + '40',
  },
  pickupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  pickupNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.emeraldGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupNumberText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  pickupDetails: {
    flex: 1,
  },
  pickupName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  pickupTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.emeraldGreen,
    marginTop: 2,
  },
  publishButton: {
    backgroundColor: COLORS.emeraldGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  pickupModal: {
    maxHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  pickupOptions: {
    maxHeight: 300,
  },
  pickupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.slate900,
    marginBottom: SPACING.sm,
  },
  pickupOptionInfo: {
    flex: 1,
  },
  pickupOptionName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  pickupOptionLandmark: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: 2,
  },
  // License image upload styles
  uploadOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  licensePreview: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  licenseImage: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  verifyingBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  verifyingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.warning,
    fontWeight: '500' as const,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.slate700,
    opacity: 0.6,
  },
  // Campus Points styles
  pointsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  pointsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  pointsValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  rewardsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.cardSurface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.pill,
  },
  rewardsButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.orange,
    fontWeight: '600' as const,
  },
  pointsEarnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.emeraldGreen + '20',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  earnInfoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.emeraldGreen,
  },
  rewardsSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  rewardsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  rewardsList: {
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  rewardCard: {
    width: 140,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  rewardCardDisabled: {
    opacity: 0.5,
  },
  rewardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  rewardName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600' as const,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  rewardDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    height: 32,
  },
  rewardCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
  },
  rewardCostText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600' as const,
    color: COLORS.warning,
  },
  // Broadcast button styles
  broadcastButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  broadcastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  broadcastButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
  },
  // QR Code styles
  showQRButton: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  qrModalContent: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.cardStroke,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  qrModalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  qrModalSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  qrInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.electricBlue + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  qrInfoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.electricBlue,
  },
  qrCloseButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  qrCloseButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
  },
});
