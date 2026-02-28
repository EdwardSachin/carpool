import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useAppStore } from '../_store/appStore';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../_constants/theme';

export const ModeToggle: React.FC = () => {
  const { mode, setMode } = useAppStore();
  const slideAnim = React.useRef(new Animated.Value(mode === 'rider' ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: mode === 'rider' ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [mode]);

  const indicatorLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.indicator,
          {
            left: indicatorLeft,
            backgroundColor: mode === 'rider' ? COLORS.electricBlue : COLORS.emeraldGreen,
          },
        ]}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => setMode('rider')}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, mode === 'rider' && styles.activeText]}>
          Rider Mode
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setMode('driver')}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, mode === 'driver' && styles.activeText]}>
          Driver Mode
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate900,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    position: 'relative',
    marginHorizontal: SPACING.md,
  },
  indicator: {
    position: 'absolute',
    width: '48%',
    height: '90%',
    borderRadius: BORDER_RADIUS.full,
    top: '5%',
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  buttonText: {
    color: COLORS.whiteAlpha60,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  activeText: {
    color: COLORS.white,
  },
});