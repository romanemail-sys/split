import React from 'react';
import { Callout, Marker, Polyline } from 'react-native-maps';
import { Text } from 'react-native';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface Props {
  points: LocationPoint[];
  color?: string;
}

export function RoutePolyline({ points, color = '#007AFF' }: Props) {
  if (points.length < 2) return null;

  const coordinates = points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  const milestones = points.filter((_, i) => i === 0 || i === points.length - 1 || i % 10 === 0);

  return (
    <>
      <Polyline coordinates={coordinates} strokeColor={color} strokeWidth={3} />
      {milestones.map((p, i) => (
        <Marker
          key={i}
          coordinate={{ latitude: p.latitude, longitude: p.longitude }}
          pinColor={color}
        >
          <Callout>
            <Text>{new Date(p.timestamp).toLocaleTimeString()}</Text>
          </Callout>
        </Marker>
      ))}
    </>
  );
}
