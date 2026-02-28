import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassContainer } from './GlassContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../_constants/theme';
import { SubscriptionTier } from '../_types';

interface PaymentModalProps {
  visible: boolean;
  tier: SubscriptionTier | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  tier,
  onSuccess,
  onClose,
}) => {
  const [step, setStep] = React.useState<'confirm' | 'processing' | 'success'>('confirm');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('confirm');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 2000);
  };

  if (!visible || !tier) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        activeOpacity={1} 
        onPress={step === 'confirm' ? onClose : undefined}
      />
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <GlassContainer style={styles.modal}>
          {step === 'confirm' && (
            <>
              <View style={styles.header}>
                <MaterialCommunityIcons name="wallet" size={48} color={COLORS.electricBlue} />
                <Text style={styles.title}>Campus Wallet</Text>
                <Text style={styles.subtitle}>Confirm your subscription</Text>
              </View>

              <View style={styles.tierSummary}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierPrice}>₹{tier.price}</Text>
                <Text style={styles.tierValidity}>{tier.validity}</Text>
              </View>

              <View style={styles.paymentMethod}>
                <Ionicons name="card" size={24} color={COLORS.electricBlue} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentLabel}>Campus Card</Text>
                  <Text style={styles.paymentDetail}>•••• 4242</Text>
                </View>
              </View>

              <View style={styles.instructionBox}>
                <MaterialCommunityIcons name="gesture-tap-button" size={32} color={COLORS.warning} />
                <Text style={styles.instructionText}>Double-Click to Pay</Text>
              </View>

              <TouchableOpacity
                style={styles.payButton}
                onPress={handlePay}
                activeOpacity={0.8}
              >
                <Text style={styles.payButtonText}>Pay ₹{tier.price}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'processing' && (
            <View style={styles.centerContent}>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                }}
              >
                <MaterialCommunityIcons name="loading" size={64} color={COLORS.electricBlue} />
              </Animated.View>
              <Text style={styles.processingText}>Processing payment...</Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.centerContent}>
              {/* Confetti Effect */}
              <View style={styles.confettiContainer}>
                {[...Array(20)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.confetti,
                      {
                        left: `${(i * 5) % 100}%`,
                        backgroundColor: i % 3 === 0 ? COLORS.electricBlue : i % 3 === 1 ? COLORS.emeraldGreen : COLORS.warning,
                        opacity: confettiAnim,
                        transform: [
                          {
                            translateY: confettiAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 300],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.emeraldGreen} />
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successMessage}>Welcome to {tier.name}</Text>
            </View>
          )}
        </GlassContainer>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modal: {
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: SPACING.xs,
  },
  tierSummary: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.lg,
  },
  tierName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
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
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  paymentInfo: {
    marginLeft: SPACING.md,
  },
  paymentLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha80,
  },
  paymentDetail: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  instructionBox: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.warning + '20',
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  instructionText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginTop: SPACING.sm,
  },
  payButton: {
    backgroundColor: COLORS.electricBlue,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  processingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    marginTop: SPACING.lg,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.lg,
  },
  successMessage: {
    fontSize: FONTS.sizes.md,
    color: COLORS.whiteAlpha80,
    marginTop: SPACING.sm,
  },
});