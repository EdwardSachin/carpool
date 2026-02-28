import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../_constants/theme';

export const MapPlaceholder: React.FC = () => {
  return (
    <View style={styles.mapPlaceholder}>
      <Ionicons name="map" size={64} color={COLORS.electricBlue} />
      <Text style={styles.mapPlaceholderText}>Interactive Map</Text>
      <Text style={styles.mapPlaceholderSubtext}>
        {Platform.OS === 'web' 
          ? 'Live map available on mobile app' 
          : 'Loading map...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.slate900,
    gap: SPACING.md,
  },
  mapPlaceholderText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  mapPlaceholderSubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.whiteAlpha60,
    textAlign: 'center',
  },
});
