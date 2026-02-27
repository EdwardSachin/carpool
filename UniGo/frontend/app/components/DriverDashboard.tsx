import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import GlassContainer from '../components/GlassContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';
import useAppStore from '../store/appStore';
import ChatModal from './ChatModal';

export const DriverDashboard: React.FC = () => {
  const { user } = useAppStore();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('NHCE Campus Gate A');
  const [departureTime, setDepartureTime] = useState('');
  const [driverStreak, setDriverStreak] = useState(12);
  const [totalRides, setTotalRides] = useState(47);
  const [rating, setRating] = useState(4.8);

  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [otherPartyName, setOtherPartyName] = useState('');
  const [publishModalVisible, setPublishModalVisible] = useState(false);

  const fetchRequests = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/ride-requests?target_driver_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setRideRequests(data.filter((r: any) => r.status === 'pending'));
      }
    } catch (error) {
      console.error('Fetch requests failed:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAcceptRequest = async (request: any) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/ride-requests/${request.id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: user?.id,
          driver_name: user?.name
        })
      });
      if (response.ok) {
        setActiveRideId(request.id);
        setOtherPartyName(request.rider_name);
        setChatVisible(true);
        fetchRequests();
      }
    } catch (error) {
      console.error('Accept failed:', error);
    }
  };

  const handlePublishRoute = () => {
    if (!origin || !departureTime) {
      alert('Please fill in route details');
      return;
    }
    setPublishModalVisible(true);
  };

  const confirmPublishRoute = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/driver-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: user?.id,
          driver_name: user?.name,
          origin,
          destination,
          departure_time: departureTime,
          available_seats: 4
        })
      });
      if (response.ok) {
        setPublishModalVisible(false);
        setOrigin('');
        setDepartureTime('');
        alert('Route published successfully!');
      }
    } catch (error) {
      console.error('Publish failed:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.profileName}>Elite Host</Text>
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

      {/* Route Publisher */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Publish Your Route</Text>
        <GlassContainer style={styles.routeForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>From</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={20} color={COLORS.emeraldGreen} />
              <TextInput
                style={styles.input}
                placeholder="Enter pickup location"
                placeholderTextColor={COLORS.whiteAlpha40}
                value={origin}
                onChangeText={setOrigin}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>To</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="flag" size={20} color={COLORS.emeraldGreen} />
              <TextInput
                style={styles.input}
                placeholder="Campus Gate A"
                placeholderTextColor={COLORS.whiteAlpha40}
                value={destination}
                onChangeText={setDestination}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Departure Time</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="time" size={20} color={COLORS.emeraldGreen} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 8:30 AM"
                placeholderTextColor={COLORS.whiteAlpha40}
                value={departureTime}
                onChangeText={setDepartureTime}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.publishButton}
            activeOpacity={0.8}
            onPress={handlePublishRoute}
          >
            <MaterialCommunityIcons name="publish" size={20} color={COLORS.white} />
            <Text style={styles.publishButtonText}>Publish Route</Text>
          </TouchableOpacity>
        </GlassContainer>
      </View>

      {/* Bounty Board */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bounty Board</Text>
        <Text style={styles.sectionSubtitle}>Nearby requests in {user?.college?.short || 'Campus'}</Text>

        {rideRequests.length === 0 ? (
          <GlassContainer style={styles.emptyRequests}>
            <Text style={styles.emptyText}>Waiting for new requests...</Text>
          </GlassContainer>
        ) : (
          rideRequests.map((request) => (
            <GlassContainer key={request.id} style={styles.bountyCard}>
              <View style={styles.bountyHeader}>
                <View style={styles.tokenBadge}>
                  <MaterialCommunityIcons name={"coin" as any} size={20} color={COLORS.warning} />
                  <Text style={styles.tokenAmount}>{request.tokens}</Text>
                </View>
                <View style={styles.ridersBadge}>
                  <Text style={styles.riderNameBadge}>{request.rider_name}</Text>
                </View>
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={18} color={COLORS.emeraldGreen} />
                  <Text style={styles.routeText}>{request.from_location}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <Ionicons name="flag" size={18} color={COLORS.electricBlue} />
                  <Text style={styles.routeText}>{request.to_location}</Text>
                </View>
              </View>

              <View style={styles.bountyFooter}>
                <View style={styles.timeInfo}>
                  <Ionicons name="time" size={16} color={COLORS.whiteAlpha60} />
                  <Text style={styles.timeText}>{request.time}</Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptButton}
                  activeOpacity={0.8}
                  onPress={() => handleAcceptRequest(request)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </GlassContainer>
          ))
        )}
      </View>

      {activeRideId && (
        <ChatModal
          visible={chatVisible}
          rideId={activeRideId}
          onClose={() => setChatVisible(false)}
          otherPartyName={otherPartyName}
        />
      )}

      {/* Confirmation Modal */}
      <Modal visible={publishModalVisible} transparent animationType="slide">
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.modalCenteredView}>
            <GlassContainer style={styles.publishConfirmModal}>
              <View style={styles.modalHeader}>
                <Ionicons name="paper-plane" size={24} color={COLORS.emeraldGreen} />
                <Text style={styles.modalTitle}>Confirm Route</Text>
                <TouchableOpacity onPress={() => setPublishModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.whiteAlpha60} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Driver</Text>
                  <Text style={styles.confirmValue}>{user?.name}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Origin</Text>
                  <Text style={styles.confirmValue}>{origin}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Destination</Text>
                  <Text style={styles.confirmValue}>{destination}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Departure</Text>
                  <Text style={styles.confirmValue}>{departureTime}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={confirmPublishRoute}>
                <Text style={styles.confirmButtonText}>Confirm & Publish</Text>
              </TouchableOpacity>
            </GlassContainer>
          </View>
        </BlurView>
      </Modal>

      {/* Elite Host Amenities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Amenities</Text>
        <Text style={styles.sectionSubtitle}>Boost your earnings with premium amenities</Text>

        <GlassContainer style={styles.amenitiesCard}>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityItem}>
              <MaterialCommunityIcons name="candy" size={32} color={COLORS.pink} />
              <Text style={styles.amenityText}>Snacks</Text>
            </View>
            <View style={styles.amenityItem}>
              <MaterialCommunityIcons name="water" size={32} color={COLORS.electricBlue} />
              <Text style={styles.amenityText}>Water</Text>
            </View>
            <View style={styles.amenityItem}>
              <MaterialCommunityIcons name="music" size={32} color={COLORS.emeraldGreen} />
              <Text style={styles.amenityText}>DJ Seat</Text>
            </View>
            <View style={styles.amenityItem}>
              <MaterialCommunityIcons name="snowflake" size={32} color={COLORS.electricBlue} />
              <Text style={styles.amenityText}>Perfect AC</Text>
            </View>
          </View>
        </GlassContainer>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontWeight: 'bold',
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: COLORS.white,
  },
  streakBadge: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    fontWeight: '600',
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.emeraldGreen,
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  publishButton: {
    backgroundColor: COLORS.emeraldGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  publishButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  bountyCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  bountyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  riderNameBadge: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  emptyRequests: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
  },
  emptyText: {
    color: COLORS.whiteAlpha40,
    fontSize: FONTS.sizes.md,
  },
  tokenAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  ridersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.electricBlue + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  ridersCount: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.electricBlue,
  },
  routeInfo: {
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
  bountyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
  },
  acceptButton: {
    backgroundColor: COLORS.emeraldGreen,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  acceptButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  amenitiesCard: {
    marginHorizontal: SPACING.md,
    padding: SPACING.lg,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  amenityItem: {
    alignItems: 'center',
    width: '22%',
  },
  amenityText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha80,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  publishConfirmModal: {
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

export default DriverDashboard;