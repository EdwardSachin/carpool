import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { TomTomMap } from './TomTomMap';
import { GlassContainer } from './GlassContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOW_STYLES } from '../_constants/theme';
import { SubscriptionTier, PickupPoint } from '../_types';
import { useAppStore, PublishedRoute, RideBroadcast } from '../_store/appStore';
import { DriverRoute } from '../_services/api';

const { width, height } = Dimensions.get('window');

// Sample rides data for demo
const SAMPLE_RIDES: DriverRoute[] = [
  {
    id: 'sample-1',
    driver_id: 'driver-1',
    driver_name: 'Rahul Sharma',
    origin: 'Indiranagar Metro',
    destination: 'NHCE Campus',
    departure_time: '8:30 AM',
    direction: 'to_college',
    available_seats: 3,
    price_per_seat: 50,
    amenities: ['AC', 'Music', 'Phone Charger'],
    pickup_points: [
      { id: 'p1', name: 'Indiranagar Metro', landmark: 'Exit Gate 2', estimatedTime: '8:30 AM' },
      { id: 'p2', name: 'Domlur Flyover', landmark: 'Near Signal', estimatedTime: '8:40 AM' },
      { id: 'p3', name: 'Koramangala BDA', landmark: 'Water Tank', estimatedTime: '8:50 AM' },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    vehicle: { make: 'Maruti Suzuki', model: 'Swift', year: '2022', color: 'White' },
  },
  {
    id: 'sample-2',
    driver_id: 'driver-2',
    driver_name: 'Priya Patel',
    origin: 'Whitefield ITPL',
    destination: 'NHCE Campus',
    departure_time: '8:15 AM',
    direction: 'to_college',
    available_seats: 2,
    price_per_seat: 75,
    amenities: ['AC', 'WiFi', 'Water Bottle'],
    pickup_points: [
      { id: 'p4', name: 'Whitefield ITPL', landmark: 'Main Gate', estimatedTime: '8:15 AM' },
      { id: 'p5', name: 'Marathahalli Bridge', landmark: 'ORR Junction', estimatedTime: '8:30 AM' },
      { id: 'p6', name: 'Bellandur Gate', landmark: 'Near Lake', estimatedTime: '8:45 AM' },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    vehicle: { make: 'Hyundai', model: 'i20', year: '2023', color: 'Red' },
  },
  {
    id: 'sample-3',
    driver_id: 'driver-3',
    driver_name: 'Amit Kumar',
    origin: 'Electronic City',
    destination: 'NHCE Campus',
    departure_time: '8:00 AM',
    direction: 'to_college',
    available_seats: 4,
    price_per_seat: 60,
    amenities: ['AC', 'Music'],
    pickup_points: [
      { id: 'p7', name: 'Electronic City Toll', landmark: 'Phase 1', estimatedTime: '8:00 AM' },
      { id: 'p8', name: 'Silk Board Junction', landmark: 'Flyover End', estimatedTime: '8:20 AM' },
      { id: 'p9', name: 'HSR Layout BDA', landmark: 'Sector 7', estimatedTime: '8:35 AM' },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    vehicle: { make: 'Honda', model: 'City', year: '2021', color: 'Silver' },
  },
];

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: '1',
    name: 'Quick Hitch',
    price: 299,
    rides: 10,
    validity: '1 month',
    features: ['10 rides', 'Standard matching', 'Basic support'],
  },
  {
    id: '2',
    name: 'Mid-Terms',
    price: 799,
    rides: 30,
    validity: '3 months',
    features: ['30 rides', 'Priority matching', 'Premium support', 'Pink Pool access'],
  },
  {
    id: '3',
    name: "Dean's List",
    price: 1499,
    rides: 100,
    validity: '6 months',
    features: ['100 rides', 'VIP matching', '24/7 support', 'All amenities', 'Carbon credits'],
  },
];

interface RiderDashboardProps {
  onSubscribe: (tier: SubscriptionTier) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onSubscribe }) => {
  const { user, publishedRoutes, rideBroadcasts, clearExpiredBroadcasts, callPolice, alertEmergencyContacts, emergencyContacts } = useAppStore();
  const [pinkPoolEnabled, setPinkPoolEnabled] = useState(false);

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // SOS state
  const [showSOSModal, setShowSOSModal] = useState(false);

  // Clear expired broadcasts on mount and periodically
  useEffect(() => {
    clearExpiredBroadcasts();
    const interval = setInterval(clearExpiredBroadcasts, 60000); // Every minute
    return () => clearInterval(interval);
  }, [clearExpiredBroadcasts]);
  const [availableRides, setAvailableRides] = useState<DriverRoute[]>(SAMPLE_RIDES);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState<DriverRoute | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<PickupPoint | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [ridePhase, setRidePhase] = useState<'idle' | 'requesting' | 'accepted' | 'en_route'>('idle');

  // Handle QR code scan
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(100);

    try {
      const qrData = JSON.parse(data);
      if (qrData.type === 'UNIGO_RIDE') {
        setShowScanner(false);
        Alert.alert(
          '✅ Ride Confirmed!',
          `You've checked in with ${qrData.driver_name}!\n\n📍 From: ${qrData.origin}\n🎯 To: ${qrData.destination}\n\nEnjoy your ride and stay safe!`,
          [{ text: 'Great!', onPress: () => setScanned(false) }]
        );
      } else {
        Alert.alert('Invalid QR', 'This is not a valid UniGo ride QR code.', [
          { text: 'Try Again', onPress: () => setScanned(false) }
        ]);
      }
    } catch {
      Alert.alert('Invalid QR', 'Could not read QR code. Please try again.', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  // Open QR scanner
  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Required', 'Please allow camera access to scan QR codes.');
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  // SOS handlers
  const handleCallPolice = () => {
    Alert.alert(
      '🚨 Call Police',
      'Are you sure you want to call the police (100)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            callPolice();
            setShowSOSModal(false);
          }
        },
      ]
    );
  };

  const handleAlertContacts = () => {
    if (emergencyContacts.length === 0) {
      Alert.alert('No Contacts', 'Please add emergency contacts in settings.');
      return;
    }
    Alert.alert(
      '📱 Alert Emergency Contacts',
      `Send SOS to:\n${emergencyContacts.map(c => `• ${c.name}`).join('\n')}\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          onPress: () => {
            alertEmergencyContacts();
            setShowSOSModal(false);
          }
        },
      ]
    );
  };

  // Combine sample rides with driver-published routes
  useEffect(() => {
    const driverRoutes = publishedRoutes.map(route => ({
      ...route,
      driver_name: route.driver_name + ' (Live)',
    }));
    // Put live routes first, then sample rides
    let allRides = [...driverRoutes, ...SAMPLE_RIDES];

    // Apply Pink Pool filtering
    if (pinkPoolEnabled) {
      allRides = allRides.filter(ride =>
        ride.driver_name.toLowerCase().includes('priya') ||
        ride.driver_name.toLowerCase().includes('sneha')
      );
    }

    setAvailableRides(allRides);
  }, [publishedRoutes, pinkPoolEnabled]);

  // Simulate refresh with sample data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const driverRoutes = publishedRoutes.map(route => ({
      ...route,
      driver_name: route.driver_name + ' (Live)',
    }));

    let allRides = [...driverRoutes, ...SAMPLE_RIDES];

    // Apply Pink Pool filtering
    if (pinkPoolEnabled) {
      allRides = allRides.filter(ride =>
        ride.driver_name.toLowerCase().includes('priya') ||
        ride.driver_name.toLowerCase().includes('sneha')
      );
    }

    setAvailableRides(allRides);
    setRefreshing(false);
  }, [publishedRoutes, pinkPoolEnabled]);

  // Request a ride (mock - no API call)
  const handleRequestRide = async () => {
    if (!selectedRide || !selectedPickup) {
      Alert.alert('Error', 'Please select a pickup point');
      return;
    }

    setIsRequesting(true);
    setRidePhase('requesting');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    setIsRequesting(false);
    setRidePhase('accepted');

    Alert.alert(
      '🎉 Ride Confirmed!',
      `Your ride with ${selectedRide.driver_name} is confirmed!\n\n📍 Pickup: ${selectedPickup.name}\n⏰ Time: ${selectedPickup.estimatedTime}\n💰 Price: ₹${selectedRide.price_per_seat}\n\nThe driver will pick you up at the designated location.`,
      [{
        text: 'Awesome!', onPress: () => {
          setRidePhase('en_route');
        }
      }]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
        }
      >
        {/* Section 1: Choose Your Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SUBSCRIPTION_TIERS.map((tier, index) => (
              <View key={tier.id} style={[styles.tierCard, index === 1 && styles.popularCard]}>
                {index === 1 && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}
                <View style={styles.tierHeader}>
                  <Ionicons
                    name={tier.id === '3' ? 'trophy' : tier.id === '2' ? 'star' : 'flash'}
                    size={32}
                    color={COLORS.orange}
                  />
                  <Text style={styles.tierName}>{tier.name}</Text>
                </View>
                <Text style={styles.tierPrice}>₹{tier.price}</Text>
                <Text style={styles.tierValidity}>{tier.validity}</Text>
                <View style={styles.features}>
                  {tier.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={() => onSubscribe(tier)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.subscribeButtonText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Section 2: Pink Pool */}
        <View style={styles.pinkPoolContainer}>
          <LinearGradient
            colors={
              pinkPoolEnabled
                ? [COLORS.pinkPoolGlow, 'transparent']
                : ['transparent', 'transparent']
            }
            style={StyleSheet.absoluteFill}
          />
          <View style={[
            styles.pinkPoolCard,
            pinkPoolEnabled && styles.pinkPoolActive,
          ]}>
            <View style={styles.pinkPoolHeader}>
              <View style={styles.pinkPoolTitleRow}>
                <Ionicons name="shield-checkmark" size={28} color={COLORS.pinkPool} />
                <View style={styles.pinkPoolTitles}>
                  <Text style={styles.pinkPoolTitle}>Pink Pool</Text>
                  <Text style={styles.pinkPoolBadge}>Women-Only Matching</Text>
                </View>
              </View>
              <Switch
                value={pinkPoolEnabled}
                onValueChange={setPinkPoolEnabled}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.pinkPool }}
                thumbColor={pinkPoolEnabled ? COLORS.white : COLORS.textTertiary}
                ios_backgroundColor={COLORS.cardBorder}
              />
            </View>
            <Text style={styles.pinkPoolDescription}>
              I'm a female and looking mainly for female drivers
            </Text>
            {pinkPoolEnabled && (
              <View style={styles.pinkPoolActiveIndicator}>
                <Text style={styles.pinkPoolActiveText}>
                  ✓ Showing verified female drivers only
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section: Live Departure Broadcasts */}
        {rideBroadcasts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.broadcastHeader}>
              <Ionicons name="megaphone" size={22} color={COLORS.orange} />
              <Text style={styles.sectionTitle}>Drivers Leaving Now</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              {rideBroadcasts.length} driver{rideBroadcasts.length > 1 ? 's' : ''} broadcasting departure
            </Text>

            {rideBroadcasts.map((broadcast) => (
              <GlassContainer key={broadcast.id} style={styles.broadcastCard}>
                <View style={styles.broadcastLive}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>

                <View style={styles.broadcastContent}>
                  <View style={styles.broadcastDriverRow}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={24} color={COLORS.orange} />
                    </View>
                    <View style={styles.broadcastDriverInfo}>
                      <Text style={styles.broadcastDriverName}>{broadcast.driver_name}</Text>
                      <Text style={styles.broadcastSeats}>
                        {broadcast.available_seats} seat{broadcast.available_seats > 1 ? 's' : ''} available
                      </Text>
                    </View>
                  </View>

                  <View style={styles.broadcastRoute}>
                    <View style={styles.routePoint}>
                      <Ionicons name="location" size={16} color={COLORS.emeraldGreen} />
                      <Text style={styles.broadcastRouteText}>{broadcast.origin}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.whiteAlpha40} />
                    <View style={styles.routePoint}>
                      <Ionicons name="navigate" size={16} color={COLORS.orange} />
                      <Text style={styles.broadcastRouteText}>{broadcast.destination}</Text>
                    </View>
                  </View>

                  <View style={styles.broadcastMeta}>
                    <View style={styles.broadcastMetaItem}>
                      <Ionicons name="time-outline" size={14} color={COLORS.electricBlue} />
                      <Text style={styles.broadcastMetaText}>Leaving {broadcast.departure_time}</Text>
                    </View>
                    {broadcast.vehicle && (
                      <View style={styles.broadcastMetaItem}>
                        <Ionicons name="car-sport-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.broadcastMetaText}>
                          {broadcast.vehicle.color} {broadcast.vehicle.make}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity style={styles.joinBroadcastButton} activeOpacity={0.85}>
                  <Text style={styles.joinBroadcastText}>Request Seat</Text>
                </TouchableOpacity>
              </GlassContainer>
            ))}
          </View>
        )}

        {/* Section 3: Available Rides */}
        <View style={styles.section}>
          <View style={styles.availableHeader}>
            <Text style={styles.sectionTitle}>Available Rides</Text>
            {isLoading && <ActivityIndicator size="small" color={COLORS.orange} />}
          </View>
          <Text style={styles.sectionSubtitle}>
            {availableRides.length} rides heading to campus • Pull to refresh
          </Text>

          {availableRides.length === 0 ? (
            <GlassContainer style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={COLORS.whiteAlpha40} />
              <Text style={styles.emptyStateTitle}>No rides available yet</Text>
              <Text style={styles.emptyStateText}>
                Pull down to refresh or check back later
              </Text>
            </GlassContainer>
          ) : (
            availableRides.map((ride) => (
              <GlassContainer key={ride.id} style={styles.rideCard}>
                {/* Driver Info */}
                <View style={styles.rideHeader}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={28} color={COLORS.orange} />
                    </View>
                    <View>
                      <Text style={styles.driverName}>{ride.driver_name}</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={COLORS.gold} />
                        <Text style={styles.ratingText}>4.8</Text>
                        <Text style={styles.seatsText}>• {ride.available_seats} seats left</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceAmount}>₹{ride.price_per_seat}</Text>
                    <Text style={styles.priceLabel}>/seat</Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeSection}>
                  <View style={styles.routePoint}>
                    <Ionicons name="location" size={18} color={COLORS.emeraldGreen} />
                    <Text style={styles.routeText}>{ride.origin}</Text>
                  </View>
                  <View style={styles.routeLine}>
                    <View style={styles.routeDots} />
                  </View>
                  <View style={styles.routePoint}>
                    <Ionicons name="school" size={18} color={COLORS.orange} />
                    <Text style={styles.routeText}>{ride.destination}</Text>
                  </View>
                </View>

                {/* Departure Time */}
                <View style={styles.departureInfo}>
                  <Ionicons name="time" size={16} color={COLORS.electricBlue} />
                  <Text style={styles.departureText}>Arrives at campus by {ride.departure_time}</Text>
                </View>

                {/* Vehicle Info */}
                {ride.vehicle && (
                  <View style={styles.vehicleInfo}>
                    <Ionicons name="car-sport" size={16} color={COLORS.orange} />
                    <Text style={styles.vehicleText}>
                      {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}
                    </Text>
                    {ride.vehicle.year && (
                      <Text style={styles.vehicleYear}>({ride.vehicle.year})</Text>
                    )}
                  </View>
                )}

                {/* Pickup Points */}
                {ride.pickup_points && ride.pickup_points.length > 0 && (
                  <View style={styles.pickupsSection}>
                    <Text style={styles.pickupsTitle}>Select Your Pickup Point</Text>
                    <View style={styles.pickupsList}>
                      {ride.pickup_points.map((pickup, index) => (
                        <TouchableOpacity
                          key={pickup.id}
                          style={[
                            styles.pickupOption,
                            selectedRide?.id === ride.id &&
                            selectedPickup?.id === pickup.id &&
                            styles.pickupOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedRide(ride);
                            setSelectedPickup(pickup);
                          }}
                        >
                          <View style={styles.pickupLeft}>
                            <View style={[
                              styles.pickupNumber,
                              selectedRide?.id === ride.id &&
                              selectedPickup?.id === pickup.id &&
                              styles.pickupNumberSelected,
                            ]}>
                              <Text style={styles.pickupNumberText}>{index + 1}</Text>
                            </View>
                            <View>
                              <Text style={styles.pickupName}>{pickup.name}</Text>
                              {pickup.landmark && (
                                <Text style={styles.pickupLandmark}>{pickup.landmark}</Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.pickupTime}>
                            <Ionicons name="time-outline" size={14} color={COLORS.emeraldGreen} />
                            <Text style={styles.pickupTimeText}>{pickup.estimatedTime}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Request Button */}
                <TouchableOpacity
                  style={[
                    styles.requestButton,
                    selectedRide?.id !== ride.id && styles.requestButtonDisabled,
                    SHADOW_STYLES.card,
                  ]}
                  onPress={handleRequestRide}
                  disabled={selectedRide?.id !== ride.id || isRequesting}
                  activeOpacity={0.85}
                >
                  {isRequesting && selectedRide?.id === ride.id ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="hand-right" size={20} color={COLORS.white} />
                      <Text style={styles.requestButtonText}>
                        {selectedRide?.id === ride.id && selectedPickup
                          ? `Request Pickup at ${selectedPickup.name}`
                          : 'Select a Pickup Point'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </GlassContainer>
            ))
          )}
        </View>

        {/* Section 4: Live Map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Map</Text>
          <Text style={styles.sectionSubtitle}>Drivers near you head to NHCE</Text>
          <View style={{ paddingHorizontal: SPACING.md }}>
            <TomTomMap
              mode="rider"
              height={400}
              availableDrivers={availableRides.map(r => ({ id: r.driver_id, name: r.driver_name }))}
              selectedDriverId={selectedRide?.driver_id || null}
              ridePhase={ridePhase}
            />
          </View>
        </View>

        {/* Spacer for bottom action bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Dynamic Island Style Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.actionBarButton}
          onPress={onRefresh}
          activeOpacity={0.85}
        >
          <View style={[styles.actionButtonInner, { backgroundColor: COLORS.electricBlue }]}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
          </View>
          <Text style={styles.actionBarLabel}>Refresh</Text>
        </TouchableOpacity>

        {/* QR Scan Button */}
        <TouchableOpacity
          style={styles.actionBarButton}
          onPress={openScanner}
          activeOpacity={0.85}
        >
          <View style={[styles.actionButtonInner, { backgroundColor: COLORS.emeraldGreen }]}>
            <Ionicons name="qr-code" size={20} color={COLORS.white} />
          </View>
          <Text style={styles.actionBarLabel}>Scan QR</Text>
        </TouchableOpacity>

        {/* SOS Button */}
        <TouchableOpacity
          style={styles.actionBarButton}
          onPress={() => setShowSOSModal(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.actionButtonInner, styles.sosActionButton]}>
            <Ionicons name="warning" size={20} color={COLORS.white} />
          </View>
          <Text style={[styles.actionBarLabel, { color: '#FF3B30' }]}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* SOS Quick Action Modal */}
      <Modal
        visible={showSOSModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSOSModal(false)}
      >
        <View style={styles.sosModalOverlay}>
          <View style={styles.sosModalContent}>
            <View style={styles.sosModalHeader}>
              <Text style={styles.sosModalTitle}>🚨 Emergency SOS</Text>
              <TouchableOpacity onPress={() => setShowSOSModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.whiteAlpha60} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sosOption} onPress={handleCallPolice}>
              <View style={[styles.sosOptionIcon, { backgroundColor: '#FF3B30' }]}>
                <Ionicons name="call" size={24} color={COLORS.white} />
              </View>
              <View style={styles.sosOptionText}>
                <Text style={styles.sosOptionTitle}>Call Police (100)</Text>
                <Text style={styles.sosOptionDesc}>Connect directly to emergency services</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sosOption} onPress={handleAlertContacts}>
              <View style={[styles.sosOptionIcon, { backgroundColor: COLORS.orange }]}>
                <Ionicons name="people" size={24} color={COLORS.white} />
              </View>
              <View style={styles.sosOptionText}>
                <Text style={styles.sosOptionTitle}>Alert Emergency Contacts</Text>
                <Text style={styles.sosOptionDesc}>
                  {emergencyContacts.length > 0
                    ? `Send SOS to ${emergencyContacts.length} contact${emergencyContacts.length > 1 ? 's' : ''}`
                    : 'No contacts added yet'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sosCloseButton}
              onPress={() => setShowSOSModal(false)}
            >
              <Text style={styles.sosCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.closeScanner}>
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Driver's QR</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Scanner overlay */}
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerCornerTL} />
              <View style={styles.scannerCornerTR} />
              <View style={styles.scannerCornerBL} />
              <View style={styles.scannerCornerBR} />
            </View>
          </View>

          <View style={styles.scannerFooter}>
            <Ionicons name="information-circle" size={24} color={COLORS.electricBlue} />
            <Text style={styles.scannerHint}>
              Point your camera at the QR code shown by the driver when you enter the vehicle
            </Text>
          </View>

          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  availableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  tierCard: {
    width: width * 0.75,
    marginLeft: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardStroke,
    position: 'relative',
  },
  popularCard: {
    borderColor: COLORS.orange,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: SPACING.lg,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
  },
  popularText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tierName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  tierPrice: {
    fontSize: FONTS.sizes.huge,
    fontWeight: 'bold' as const,
    color: COLORS.orange,
    marginBottom: SPACING.xs,
  },
  tierValidity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  features: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '500' as const,
  },
  subscribeButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  pinkPoolContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  pinkPoolCard: {
    backgroundColor: COLORS.cardSurface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardStroke,
  },
  pinkPoolActive: {
    borderColor: COLORS.pinkPoolBorder,
    borderWidth: 2,
  },
  pinkPoolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pinkPoolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  pinkPoolTitles: {
    flex: 1,
  },
  pinkPoolTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  pinkPoolBadge: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.pinkPool,
    fontWeight: '600' as const,
  },
  pinkPoolDescription: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    lineHeight: 22,
  },
  pinkPoolActiveIndicator: {
    marginTop: SPACING.md,
  },
  pinkPoolActiveText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.pinkPool,
    fontWeight: '600' as const,
  },
  emptyState: {
    marginHorizontal: SPACING.md,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  rideCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  seatsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  priceTag: {
    backgroundColor: COLORS.emeraldGreen + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  priceAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.emeraldGreen,
  },
  priceLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.emeraldGreen,
  },
  routeSection: {
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeLine: {
    marginLeft: 9,
    paddingVertical: SPACING.xs,
  },
  routeDots: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.slate700,
  },
  routeText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  departureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  departureText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.electricBlue,
    fontWeight: '500' as const,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.cardSurface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  vehicleText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '500' as const,
  },
  vehicleYear: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
  },
  pickupsSection: {
    marginBottom: SPACING.md,
  },
  pickupsTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha80,
    marginBottom: SPACING.sm,
    fontWeight: '600' as const,
  },
  pickupsList: {
    gap: SPACING.sm,
  },
  pickupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate900,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickupOptionSelected: {
    borderColor: COLORS.emeraldGreen,
    backgroundColor: COLORS.emeraldGreen + '10',
  },
  pickupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  pickupNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupNumberSelected: {
    backgroundColor: COLORS.emeraldGreen,
  },
  pickupNumberText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  pickupName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  pickupLandmark: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
    marginTop: 2,
  },
  pickupTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pickupTimeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.emeraldGreen,
    fontWeight: '600' as const,
  },
  requestButton: {
    backgroundColor: COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  requestButtonDisabled: {
    backgroundColor: COLORS.cardBorder,
  },
  requestButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  // Broadcast notification styles
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  broadcastCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderColor: COLORS.orange,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  broadcastLive: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold' as const,
    color: '#EF4444',
    letterSpacing: 1,
  },
  broadcastContent: {
    marginTop: SPACING.sm,
  },
  broadcastDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  broadcastDriverInfo: {
    flex: 1,
  },
  broadcastDriverName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  broadcastSeats: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.emeraldGreen,
    fontWeight: '500' as const,
  },
  broadcastRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.whiteAlpha05,
    borderRadius: BORDER_RADIUS.md,
  },
  broadcastRouteText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    marginLeft: 4,
  },
  broadcastMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  broadcastMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  broadcastMetaText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  joinBroadcastButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  joinBroadcastText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  // Bottom Action Bar (Dynamic Island style)
  bottomActionBar: {
    position: 'absolute',
    bottom: 30,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 35, 0.95)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionBarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sosActionButton: {
    backgroundColor: '#FF3B30',
  },
  actionBarLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
    fontWeight: '500' as const,
  },
  // QR Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeScanner: {
    padding: SPACING.sm,
  },
  scannerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.emeraldGreen,
    borderTopLeftRadius: 8,
  },
  scannerCornerTR: {
    position: 'absolute',
    top: height * 0.25,
    right: width * 0.15,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.emeraldGreen,
    borderTopRightRadius: 8,
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.15,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.emeraldGreen,
    borderBottomLeftRadius: 8,
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: height * 0.25,
    right: width * 0.15,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.emeraldGreen,
    borderBottomRightRadius: 8,
  },
  scannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scannerHint: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  rescanText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  // SOS Modal styles
  sosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  sosModalContent: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  sosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sosModalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  sosOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.whiteAlpha05,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  sosOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sosOptionText: {
    flex: 1,
  },
  sosOptionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.white,
    marginBottom: 2,
  },
  sosOptionDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  sosCloseButton: {
    backgroundColor: COLORS.cardBorder,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  sosCloseButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '500' as const,
  },
});
