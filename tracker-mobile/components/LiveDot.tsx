import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

interface Props {
  latitude: number;
  longitude: number;
  color?: string;
}

export function LiveDot({ latitude, longitude, color = '#FF3B30' }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }}>
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ scale }] }]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
});
