import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassContainer } from './GlassContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../_constants/theme';
import { Rating } from '../_types';

const { height } = Dimensions.get('window');

interface VibeCheckModalProps {
  visible: boolean;
  driverName: string;
  onSubmit: (rating: Rating) => void;
  onClose: () => void;
}

const AMENITIES = [
  { id: 'snacks', icon: 'candy', label: 'Snacks & Chocolates', color: COLORS.pink },
  { id: 'water', icon: 'water', label: 'Hydration Station', color: COLORS.electricBlue },
  { id: 'music', icon: 'music', label: 'DJ Seat', color: COLORS.emeraldGreen },
  { id: 'ac', icon: 'snowflake', label: 'Perfect AC', color: COLORS.electricBlue },
];

export const VibeCheckModal: React.FC<VibeCheckModalProps> = ({
  visible,
  driverName,
  onSubmit,
  onClose,
}) => {
  const [smoothness, setSmoothness] = React.useState(5);
  const [comfort, setComfort] = React.useState(5);
  const [selectedAmenities, setSelectedAmenities] = React.useState<string[]>([]);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnimations = useRef(
    AMENITIES.reduce((acc, amenity) => {
      acc[amenity.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const toggleAmenity = (amenityId: string) => {
    const isSelected = selectedAmenities.includes(amenityId);
    
    // Bounce animation
    Animated.sequence([
      Animated.spring(scaleAnimations[amenityId], {
        toValue: 1.2,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimations[amenityId], {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    if (isSelected) {
      setSelectedAmenities(selectedAmenities.filter((id) => id !== amenityId));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityId]);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      smoothness,
      comfort,
      amenities: selectedAmenities,
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <GlassContainer style={styles.modal}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="star-circle" size={48} color={COLORS.warning} />
            <Text style={styles.title}>Vibe Check</Text>
            <Text style={styles.subtitle}>Rate your ride with {driverName}</Text>
          </View>

          {/* Driving Smoothness Slider */}
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabel}>Driving Smoothness</Text>
            <View style={styles.sliderContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sliderDot,
                    smoothness >= value && styles.sliderDotActive,
                  ]}
                  onPress={() => setSmoothness(value)}
                />
              ))}
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Bumpy</Text>
              <Text style={styles.sliderValueText}>{smoothness}/10</Text>
              <Text style={styles.sliderLabelText}>Smooth</Text>
            </View>
          </View>

          {/* Overall Comfort Slider */}
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabel}>Overall Comfort</Text>
            <View style={styles.sliderContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sliderDot,
                    comfort >= value && styles.sliderDotActive,
                  ]}
                  onPress={() => setComfort(value)}
                />
              ))}
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Meh</Text>
              <Text style={styles.sliderValueText}>{comfort}/10</Text>
              <Text style={styles.sliderLabelText}>Amazing</Text>
            </View>
          </View>

          {/* Elite Host Amenities */}
          <View style={styles.amenitiesSection}>
            <Text style={styles.amenitiesTitle}>Elite Host Amenities</Text>
            <Text style={styles.amenitiesSubtitle}>Award bonus points for extras</Text>
            <View style={styles.amenitiesGrid}>
              {AMENITIES.map((amenity) => (
                <Animated.View
                  key={amenity.id}
                  style={{
                    transform: [{ scale: scaleAnimations[amenity.id] }],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.amenityChip,
                      selectedAmenities.includes(amenity.id) && {
                        backgroundColor: amenity.color + '40',
                        borderColor: amenity.color,
                      },
                    ]}
                    onPress={() => toggleAmenity(amenity.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={amenity.icon as any}
                      size={32}
                      color={selectedAmenities.includes(amenity.id) ? amenity.color : COLORS.whiteAlpha60}
                    />
                    <Text
                      style={[
                        styles.amenityLabel,
                        selectedAmenities.includes(amenity.id) && {
                          color: amenity.color,
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      {amenity.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="send" size={20} color={COLORS.white} />
            <Text style={styles.submitButtonText}>Submit Vibe Check</Text>
          </TouchableOpacity>
        </GlassContainer>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    maxHeight: height * 0.85,
  },
  modal: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xl,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.whiteAlpha40,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginTop: SPACING.xs,
  },
  sliderSection: {
    marginBottom: SPACING.xl,
  },
  sliderLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.slate800,
    borderWidth: 2,
    borderColor: COLORS.slate700,
  },
  sliderDotActive: {
    backgroundColor: COLORS.electricBlue,
    borderColor: COLORS.electricBlue,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabelText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
  },
  sliderValueText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.electricBlue,
  },
  amenitiesSection: {
    marginBottom: SPACING.lg,
  },
  amenitiesTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  amenitiesSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    marginBottom: SPACING.md,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  amenityChip: {
    width: 160,
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.slate800,
  },
  amenityLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.whiteAlpha60,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.emeraldGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});