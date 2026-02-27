import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import useAppStore from '../store/appStore';
import GlassContainer from '../components/GlassContainer';
import MapPlaceholder from '../components/MapPlaceholder';
import ChatModal from './ChatModal';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';
import { SubscriptionTier } from '../types';

const { width } = Dimensions.get('window');

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

const MOCK_DRIVERS = [
  { id: 'Rahul', name: 'Rahul', latitude: 12.9352, longitude: 77.6245, isFemale: false, collegeId: '1', origin: 'Koramangala 4th Block', destination: 'NHCE' },
  { id: 'Priya', name: 'Priya', latitude: 12.9121, longitude: 77.6446, isFemale: true, collegeId: '1', origin: 'HSR 2nd Sector', destination: 'NHCE' },
  { id: 'Arjun', name: 'Arjun', latitude: 12.9568, longitude: 77.7011, isFemale: false, collegeId: '1', origin: 'Marathahalli Bridge', destination: 'NHCE' },
  { id: 'Sneha', name: 'Sneha', latitude: 12.9680, longitude: 77.6110, isFemale: true, collegeId: '1', origin: 'Indiranagar 100ft Rd', destination: 'NHCE' },
  { id: 'Vivek', name: 'Vivek', latitude: 12.9711, longitude: 77.7497, isFemale: false, collegeId: '2', origin: 'Whitefield', destination: 'MVIT' },
];

interface RiderDashboardProps {
  onSubscribe: (tier: SubscriptionTier) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onSubscribe }) => {
  const { user } = useAppStore();
  const [pinkPoolEnabled, setPinkPoolEnabled] = React.useState(false);
  const [location, setLocation] = React.useState<Location.LocationObject | null>(null);
  const [requestStatus, setRequestStatus] = React.useState<string | null>(null);
  const [activeRideId, setActiveRideId] = React.useState<string | null>(null);
  const [chatVisible, setChatVisible] = React.useState(false);
  const [driverName, setDriverName] = React.useState('');
  const [confirmModalVisible, setConfirmModalVisible] = React.useState(false);
  const [selectedDriver, setSelectedDriver] = React.useState<any>(null);
  const [distanceInfo, setDistanceInfo] = React.useState({ meters: 0, text: '', eta: '' });

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (newLoc) => setLocation(newLoc)
      );
      return () => subscription.remove();
    })();
  }, []);

  const checkRideStatus = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/ride-requests?rider_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const acceptedRide = data.find((r: any) => r.status === 'accepted');
        if (acceptedRide && !activeRideId) {
          console.log('RIDER: Accepted ride detected!', acceptedRide.id);
          setActiveRideId(acceptedRide.id);
          setDriverName(acceptedRide.driver_name || 'Driver');
          setChatVisible(true);
        }
      }
    } catch (error) {
      console.log('Status check failed:', error);
    }
  };

  React.useEffect(() => {
    const interval = setInterval(checkRideStatus, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const filteredDrivers = React.useMemo(() => {
    if (!user?.college?.id) return [];
    let drivers = MOCK_DRIVERS.filter(d => d.collegeId === user?.college?.id);
    if (pinkPoolEnabled) {
      drivers = drivers.filter(driver => driver.isFemale);
    }
    return drivers;
  }, [pinkPoolEnabled, user]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    if (distanceKm < 1) {
      return `${(distanceKm * 1000).toFixed(0)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  };

  const handleOpenConfirm = (driver: any) => {
    if (!location) return;

    // Calculate distance in meters
    const R = 6371000; // Radius of the earth in meters
    const dLat = (driver.latitude - location.coords.latitude) * (Math.PI / 180);
    const dLon = (driver.longitude - location.coords.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(location.coords.latitude * (Math.PI / 180)) * Math.cos(driver.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = Math.round(R * c);

    // Estimated time (assuming 20km/h avg in traffic)
    const minutes = Math.round((distMeters / 333) + 2);
    const etaTime = new Date(Date.now() + minutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDistanceInfo({
      meters: distMeters,
      text: distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} km` : `${distMeters} m`,
      eta: etaTime
    });
    setSelectedDriver(driver);
    setConfirmModalVisible(true);
  };

  const handleRequestRide = async () => {
    if (!selectedDriver || !location || !user?.college?.id) {
      alert('Location or College data missing.');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/ride-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: user.id,
          rider_name: user.name,
          college_id: user.college.id,
          from_location: 'Current Location',
          to_location: user.college.name,
          rider_lat: location.coords.latitude,
          rider_lng: location.coords.longitude,
          time: new Date().toLocaleTimeString(),
          tokens: 50,
          target_driver_id: selectedDriver.id
        })
      });
      if (response.ok) {
        setConfirmModalVisible(false);
        setActiveRideId(null);
        setChatVisible(false);
        setRequestStatus(`Requested ${selectedDriver.name}! Waiting for acceptance...`);
        setTimeout(() => setRequestStatus(null), 5000);
      }
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Subscription Tiers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SUBSCRIPTION_TIERS.map((tier) => (
              <GlassContainer key={tier.id} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <Ionicons
                    name={tier.id === '3' ? 'trophy' : tier.id === '2' ? 'star' : 'flash'}
                    size={32}
                    color={COLORS.electricBlue}
                  />
                  <Text style={styles.tierName}>{tier.name}</Text>
                </View>
                <Text style={styles.tierPrice}>₹{tier.price}</Text>
                <Text style={styles.tierValidity}>{tier.validity}</Text>
                <View style={styles.features}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.emeraldGreen} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={() => onSubscribe(tier)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.subscribeButtonText}>Subscribe</Text>
                </TouchableOpacity>
              </GlassContainer>
            ))}
          </ScrollView>
        </View>

        {/* Pink Pool Toggle */}
        <GlassContainer style={styles.pinkPoolContainer}>
          <View style={styles.pinkPoolHeader}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.pink} />
            <Text style={styles.pinkPoolTitle}>Pink Pool</Text>
            <Text style={styles.pinkPoolBadge}>Women Only</Text>
          </View>
          <Text style={styles.pinkPoolDescription}>
            Exclusive matching with verified women riders and drivers
          </Text>
          <Switch
            value={pinkPoolEnabled}
            onValueChange={setPinkPoolEnabled}
            trackColor={{ false: COLORS.slate700, true: COLORS.pink }}
            thumbColor={pinkPoolEnabled ? COLORS.white : COLORS.whiteAlpha60}
          />
        </GlassContainer>

        {/* Live Route Matcher */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rides to Campus</Text>
          {requestStatus && (
            <GlassContainer style={styles.statusBanner}>
              <Ionicons name="notifications" size={20} color={COLORS.orange} />
              <Text style={styles.statusText}>{requestStatus}</Text>
            </GlassContainer>
          )}
          <GlassContainer style={styles.mapContainer}>
            <MapPlaceholder
              drivers={filteredDrivers}
              userLocation={location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : undefined}
              highlightedDriver={selectedDriver}
            />
          </GlassContainer>

          {/* Available Drivers */}
          <View style={styles.driversSection}>
            <Text style={styles.driversTitle}>Nearby Drivers in {user?.college?.short || 'Campus'}</Text>
            {filteredDrivers.map((driver) => (
              <GlassContainer key={driver.id} style={styles.driverCard}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Ionicons name="person" size={24} color={COLORS.electricBlue} />
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <View style={styles.driverStats}>
                      <Ionicons name="star" size={14} color={COLORS.warning} />
                      <Text style={styles.driverRating}>4.8</Text>
                      <Text style={styles.driverDistance}>
                        • {location ? `${calculateDistance(location.coords.latitude, location.coords.longitude, driver.latitude, driver.longitude)}` : '...'} away
                      </Text>
                    </View>
                    <Text style={styles.routeText}>
                      <Ionicons name="location-outline" size={12} color={COLORS.electricBlue} /> {driver.origin} → {driver.destination}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => handleOpenConfirm(driver)}
                  >
                    <Text style={styles.requestButtonText}>Request</Text>
                  </TouchableOpacity>
                </View>
              </GlassContainer>
            ))}
          </View>
        </View>
      </ScrollView>

      {activeRideId && (
        <>
          <TouchableOpacity
            style={styles.floatingChatButton}
            onPress={() => setChatVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={28} color={COLORS.white} />
            {!chatVisible && <View style={styles.unreadBadge} />}
          </TouchableOpacity>

          <ChatModal
            visible={chatVisible}
            rideId={activeRideId}
            onClose={() => setChatVisible(false)}
            otherPartyName={driverName}
          />
        </>
      )}

      {/* Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="slide">
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.modalCenteredView}>
            <GlassContainer style={styles.rideConfirmModal}>
              <View style={styles.modalHeader}>
                <Ionicons name="car-sport" size={24} color={COLORS.emeraldGreen} />
                <Text style={styles.modalTitle}>Confirm Ride</Text>
                <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.whiteAlpha60} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Driver</Text>
                  <Text style={styles.confirmValue}>{selectedDriver?.name}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Pickup</Text>
                  <Text style={styles.confirmValue} numberOfLines={1}>Current Location</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Dropoff</Text>
                  <Text style={styles.confirmValue} numberOfLines={1}>{user?.college?.short || 'Campus'}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Distance</Text>
                  <Text style={styles.confirmValue}>{distanceInfo.text}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Est. Arrival</Text>
                  <Text style={styles.confirmValue}>{distanceInfo.eta}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleRequestRide}>
                <Text style={styles.confirmButtonText}>Confirm Request</Text>
              </TouchableOpacity>
            </GlassContainer>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0c1120' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  tierCard: {
    width: width * 0.75,
    marginLeft: SPACING.md,
    padding: SPACING.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tierName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  tierPrice: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.electricBlue,
    marginBottom: SPACING.xs,
  },
  tierValidity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginBottom: SPACING.md,
  },
  features: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha80,
  },
  subscribeButton: {
    backgroundColor: COLORS.electricBlue,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  pinkPoolContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  pinkPoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pinkPoolTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  pinkPoolBadge: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.pink,
    backgroundColor: COLORS.pink + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    fontWeight: '600',
  },
  pinkPoolDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginBottom: SPACING.md,
  },
  statusBanner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange + '15',
    borderColor: COLORS.orange + '30',
  },
  statusText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.orange,
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: SPACING.md,
    height: 300,
    overflow: 'hidden',
  },
  driversSection: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  driversTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  driverCard: {
    marginBottom: SPACING.sm,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  driverName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  driverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  driverRating: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  driverDistance: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  requestButton: {
    backgroundColor: COLORS.electricBlue,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  requestButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  routeText: {
    color: COLORS.whiteAlpha60,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  floatingChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  unreadBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  rideConfirmModal: {
    width: '100%',
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    flex: 1,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalContent: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.whiteAlpha40,
    paddingBottom: SPACING.xs,
  },
  confirmLabel: {
    color: COLORS.whiteAlpha60,
    fontSize: FONTS.sizes.sm,
  },
  confirmValue: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  confirmButton: {
    backgroundColor: COLORS.emeraldGreen,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sizes.md,
  },
});

export default RiderDashboard;