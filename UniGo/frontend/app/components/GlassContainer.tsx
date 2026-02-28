import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  style,
  intensity = 20,
}) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

export default GlassContainer;

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha40,
  },
  content: {
    padding: 16,
  },
});