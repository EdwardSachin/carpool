import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from './_store/appStore';
import { OnboardingModal } from './_components/OnboardingModal';
import { RiderDashboard } from './_components/RiderDashboard';
import { DriverDashboard } from './_components/DriverDashboard';
import { PaymentModal } from './_components/PaymentModal';
import { VibeCheckModal } from './_components/VibeCheckModal';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOW_STYLES } from './_constants/theme';
import { SubscriptionTier, Rating } from './_types';

export default function Index() {
  const { user, isOnboarded, mode, setOnboarded, setMode, loadPersistedData, logout } = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const bgColorAnim = useRef(new Animated.Value(0)).current;

  // Default eco stats if user doesn't have any
  const ecoStats = user?.ecoStats || {
    carbonSavedKg: 24.5,
    timeSavedMinutes: 180,
    totalRides: 15,
    treesEquivalent: 1,
  };

  useEffect(() => {
    console.log('[APP] Initializing Index...');
    loadPersistedData().then(() => {
      console.log('[APP] Persisted data loaded');
      // Use the latest state to check if onboarded, avoiding stale closures
      if (!useAppStore.getState().isOnboarded) {
        console.log('[APP] User not onboarded, showing modal');
        setTimeout(() => setShowOnboarding(true), 300);
      }
    }).catch(err => {
      console.error('[APP] Error loading persisted data:', err);
    });
  }, []);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: mode === 'rider' ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();

    Animated.timing(bgColorAnim, {
      toValue: mode === 'rider' ? 0 : 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [mode]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboarded(true);
  };

  const handleSubscribe = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedTier(null);
  };

  const handleRatingSubmit = (rating: Rating) => {
    console.log('Rating submitted:', rating);
    setShowVibeCheck(false);
  };

  const toggleLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['4%', '52%'],
  });

  const backgroundColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.backgroundRider, COLORS.backgroundDriver],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoIcon}>
              <Ionicons name="car-sport" size={24} color={COLORS.orange} />
            </View>
            <View>
              <Text style={styles.logoText}>CampusPool</Text>
              {user?.college && (
                <Text style={styles.collegeText}>@ {user.college.short}</Text>
              )}
            </View>
          </View>

          {/* Profile & Controls */}
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                logout();
                setShowOnboarding(true);
              }}
            >
              <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => setShowStatsModal(true)}
            >
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.white} />
                </View>
              )}
              <View style={styles.ecoIndicator}>
                <Ionicons name="leaf" size={10} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Mode Toggle */}
        <View style={styles.toggleContainer}>
          <View style={[styles.togglePill, SHADOW_STYLES.card]}>
            <Animated.View
              style={[
                styles.toggleIndicator,
                {
                  left: toggleLeft,
                  backgroundColor: COLORS.orange,
                },
                SHADOW_STYLES.glow,
              ]}
            />
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setMode('rider')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person"
                size={18}
                color={mode === 'rider' ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, mode === 'rider' && styles.toggleTextActive]}>
                Rider
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setMode('driver')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="car"
                size={18}
                color={mode === 'driver' ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, mode === 'driver' && styles.toggleTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashboard Content */}
        <View style={styles.content}>
          {mode === 'rider' ? (
            <RiderDashboard onSubscribe={handleSubscribe} />
          ) : (
            <DriverDashboard />
          )}
        </View>

        {/* Enhanced Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, SHADOW_STYLES.glow]}
          onPress={() => setShowVibeCheck(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.orange, COLORS.orangeDark]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="star" size={24} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Modals */}
        <OnboardingModal
          visible={showOnboarding}
          onComplete={handleOnboardingComplete}
        />
        <PaymentModal
          visible={showPayment}
          tier={selectedTier}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
        <VibeCheckModal
          visible={showVibeCheck}
          driverName="Rahul"
          onSubmit={handleRatingSubmit}
          onClose={() => setShowVibeCheck(false)}
        />

        {/* Eco Stats Modal */}
        <Modal
          visible={showStatsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatsModal(false)}
        >
          <View style={styles.statsModalOverlay}>
            <View style={styles.statsModalContent}>
              {/* Profile Header */}
              <View style={styles.statsProfileHeader}>
                <View style={styles.statsAvatar}>
                  {user?.profilePicture ? (
                    <Image source={{ uri: user.profilePicture }} style={styles.statsProfileImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={COLORS.orange} />
                  )}
                </View>
                <Text style={styles.statsUserName}>{user?.name || 'Campus Pooler'}</Text>
                <Text style={styles.statsUserCollege}>{user?.college?.name || 'Your College'}</Text>
              </View>

              {/* Eco Impact Stats */}
              <Text style={styles.statsTitle}>Your Eco Impact</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.statIconBg}
                  >
                    <Ionicons name="leaf" size={24} color={COLORS.white} />
                  </LinearGradient>
                  <Text style={styles.statValue}>{ecoStats.carbonSavedKg.toFixed(1)} kg</Text>
                  <Text style={styles.statLabel}>CO₂ Saved</Text>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.statIconBg}
                  >
                    <Ionicons name="time" size={24} color={COLORS.white} />
                  </LinearGradient>
                  <Text style={styles.statValue}>{Math.floor(ecoStats.timeSavedMinutes / 60)}h {ecoStats.timeSavedMinutes % 60}m</Text>
                  <Text style={styles.statLabel}>Time Saved</Text>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={[COLORS.orange, COLORS.orangeDark]}
                    style={styles.statIconBg}
                  >
                    <Ionicons name="car" size={24} color={COLORS.white} />
                  </LinearGradient>
                  <Text style={styles.statValue}>{ecoStats.totalRides}</Text>
                  <Text style={styles.statLabel}>Total Rides</Text>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.statIconBg}
                  >
                    <Ionicons name="flower" size={24} color={COLORS.white} />
                  </LinearGradient>
                  <Text style={styles.statValue}>{ecoStats.treesEquivalent}</Text>
                  <Text style={styles.statLabel}>Trees Equivalent</Text>
                </View>
              </View>

              {/* Impact Message */}
              <View style={styles.impactMessage}>
                <Ionicons name="earth" size={24} color={COLORS.emeraldGreen} />
                <Text style={styles.impactText}>
                  By carpooling, you're helping reduce traffic and emissions on your campus routes!
                </Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.statsCloseButton}
                onPress={() => setShowStatsModal(false)}
              >
                <Text style={styles.statsCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardStroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.heavy,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  collegeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.semibold,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoutButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.cardStroke,
  },
  // Profile button styles
  profileButton: {
    position: 'relative',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 2,
    borderColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  ecoIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.emeraldGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.slate900,
  },
  // Stats modal styles
  statsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  statsModalContent: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 380,
  },
  statsProfileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  statsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.orange,
  },
  statsProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  statsUserName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  statsUserCollege: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: SPACING.xs,
  },
  statsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.slate800,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
    marginTop: SPACING.xs,
  },
  impactMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emeraldGreen + '20',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  impactText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.emeraldGreen,
    lineHeight: 20,
  },
  statsCloseButton: {
    backgroundColor: COLORS.slate800,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statsCloseText: {
    color: COLORS.whiteAlpha60,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  toggleContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.pill,
    padding: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.cardStroke,
  },
  toggleIndicator: {
    position: 'absolute',
    width: '46%',
    height: '86%',
    borderRadius: BORDER_RADIUS.pill,
    top: '7%',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.bold,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});