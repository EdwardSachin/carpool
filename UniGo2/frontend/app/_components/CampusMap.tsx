import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../_constants/theme';
import { Svg, Path, Circle, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { TomTomMap } from './TomTomMap';

const { width } = Dimensions.get('window');

// Sample pickup points for the campus area
const CAMPUS_PICKUP_POINTS = [
  { id: '1', name: 'Main Gate', lat: 12.9716, lng: 77.5946 },
  { id: '2', name: 'Library', lat: 12.9726, lng: 77.5956 },
  { id: '3', name: 'Canteen', lat: 12.9706, lng: 77.5936 },
  { id: '4', name: 'Hostel Block', lat: 12.9696, lng: 77.5966 },
];

interface CampusMapProps {
  mode: 'rider' | 'driver';
  useTomTom?: boolean;
  onPickupSelect?: (pointId: string) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({ 
  mode, 
  useTomTom = true,
  onPickupSelect 
}) => {
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createPulse(pulseAnim1, 0);
    createPulse(pulseAnim2, 300);
    createPulse(pulseAnim3, 600);
  }, []);

  // Use TomTom Map on mobile platforms
  if (useTomTom && Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.mapCard}>
          <TomTomMap
            mode={mode}
            showPickupPoints={true}
            showRoute={true}
            showTraffic={true}
            pickupPoints={CAMPUS_PICKUP_POINTS}
            onPickupSelect={onPickupSelect}
            height={230}
          />
        </View>
      </View>
    );
  }

  // Fallback SVG map for web or when TomTom is disabled
  return (
    <View style={styles.container}>
      <View style={styles.mapCard}>
        <Svg width="100%" height="100%" viewBox="0 0 320 240">
          <Defs>
            <SvgGradient id="neonBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={COLORS.neonBlue} stopOpacity="1" />
              <Stop offset="100%" stopColor={COLORS.neonBlue} stopOpacity="0.4" />
            </SvgGradient>
          </Defs>

          {/* Background grid */}
          {[...Array(8)].map((_, i) => (
            <Line
              key={`v${i}`}
              x1={i * 40}
              y1="0"
              x2={i * 40}
              y2="240"
              stroke={COLORS.cardBorder}
              strokeWidth="0.5"
              opacity="0.2"
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <Line
              key={`h${i}`}
              x1="0"
              y1={i * 40}
              x2="320"
              y2={i * 40}
              stroke={COLORS.cardBorder}
              strokeWidth="0.5"
              opacity="0.2"
            />
          ))}

          {/* Possible Routes (dotted white) */}
          <Path
            d="M 40,180 L 100,160 L 160,180 L 220,160"
            stroke={COLORS.dottedWhite}
            strokeWidth="2"
            strokeDasharray="4,4"
            fill="none"
          />
          <Path
            d="M 80,200 L 120,180 L 180,200 L 240,180"
            stroke={COLORS.dottedWhite}
            strokeWidth="2"
            strokeDasharray="4,4"
            fill="none"
          />

          {/* Most Used Routes (neon blue glow) */}
          <Path
            d="M 40,120 Q 80,80 160,120 T 280,120"
            stroke="url(#neonBlueGradient)"
            strokeWidth="5"
            fill="none"
            opacity="1"
          />
          <Path
            d="M 60,140 L 140,100 L 220,140 L 260,100"
            stroke="url(#neonBlueGradient)"
            strokeWidth="5"
            fill="none"
            opacity="0.9"
          />

          {/* Campus location with glow */}
          <Circle cx="160" cy="80" r="24" fill={COLORS.orangeGlow} opacity="0.4" />
          <Circle cx="160" cy="80" r="14" fill={COLORS.orange} />

          {/* Starting points */}
          <Circle cx="40" cy="120" r="8" fill={COLORS.neonBlue} opacity="0.3" />
          <Circle cx="40" cy="120" r="5" fill={COLORS.neonBlue} />
          <Circle cx="60" cy="140" r="8" fill={COLORS.neonBlue} opacity="0.3" />
          <Circle cx="60" cy="140" r="5" fill={COLORS.neonBlue} />
          <Circle cx="280" cy="120" r="8" fill={COLORS.neonBlue} opacity="0.3" />
          <Circle cx="280" cy="120" r="5" fill={COLORS.neonBlue} />
        </Svg>

        {/* Pulsing Car Icons (React Native Animated) */}
        <Animated.View
          style={[
            styles.carIcon,
            { left: '15%', top: '48%', transform: [{ scale: pulseAnim1 }] },
          ]}
        >
          <Ionicons name="car" size={16} color={COLORS.orange} />
        </Animated.View>
        <Animated.View
          style={[
            styles.carIcon,
            { left: '50%', top: '38%', transform: [{ scale: pulseAnim2 }] },
          ]}
        >
          <Ionicons name="car" size={16} color={COLORS.orange} />
        </Animated.View>
        <Animated.View
          style={[
            styles.carIcon,
            { left: '75%', top: '55%', transform: [{ scale: pulseAnim3 }] },
          ]}
        >
          <Ionicons name="car" size={16} color={COLORS.orange} />
        </Animated.View>

        {/* Campus Label */}
        <View style={styles.campusLabel}>
          <Ionicons name="school" size={14} color={COLORS.white} />
          <Text style={styles.campusText}>NHCE Campus</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: COLORS.neonBlue }]} />
            <Text style={styles.legendText}>Most Used</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendLine,
                { backgroundColor: COLORS.dottedWhite, opacity: 0.6 },
              ]}
            />
            <Text style={styles.legendText}>Possible</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="car" size={12} color={COLORS.orange} />
            <Text style={styles.legendText}>Live</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  mapCard: {
    height: 260,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.glassWhiteBorder,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    position: 'relative',
  },
  carIcon: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  campusLabel: {
    position: 'absolute',
    top: 50,
    left: '50%',
    transform: [{ translateX: -55 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  campusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  legend: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 0.5,
    borderColor: COLORS.glassWhiteBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: FONTS.weights.semibold,
  },
});