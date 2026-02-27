import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../constants/theme';

const TOMTOM_API_KEY = 'CHKrCosQhhodrT8UO4bFl0M3v3e8GDJL';

// NHCE Campus center coordinates
const DEFAULT_CENTER = { lat: 12.9611, lng: 77.7297 };
const DEFAULT_ZOOM = 14;

interface Driver {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface MapPlaceholderProps {
  drivers?: Driver[];
  userLocation?: UserLocation;
  center?: { lat: number; lng: number };
  zoom?: number;
}

const generateMapHTML = (
  drivers: Driver[],
  userLocation: UserLocation | undefined,
  center: { lat: number; lng: number },
  zoom: number
): string => {
  const markersJS = drivers
    .map(
      (driver) => `
      var el_${driver.id} = document.createElement('div');
      el_${driver.id}.className = 'driver-marker';
      el_${driver.id}.innerHTML = '<div class="marker-dot"></div><div class="marker-label">${driver.name}</div>';
      
      new tt.Marker({ element: el_${driver.id} })
        .setLngLat([${driver.longitude}, ${driver.latitude}])
        .addTo(map);
    `
    )
    .join('\n');

  const userMarkerJS = userLocation ? `
    var userEl = document.createElement('div');
    userEl.className = 'user-marker';
    userEl.innerHTML = '<div class="user-dot"></div>';
    
    new tt.Marker({ element: userEl })
      .setLngLat([${userLocation.longitude}, ${userLocation.latitude}])
      .addTo(map);
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css" />
  <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
    #map { width: 100%; height: 100%; }
    
    .driver-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .marker-dot {
      width: 16px;
      height: 16px;
      background: #FF7F50;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(255, 127, 80, 0.6);
      animation: pulse 2s ease-in-out infinite;
    }
    .marker-label {
      margin-top: 4px;
      background: rgba(28, 28, 30, 0.9);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 8px;
    }

    .user-marker {
      z-index: 100;
    }
    .user-dot {
      width: 18px;
      height: 18px;
      background: #0A84FF;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(10, 132, 255, 0.8);
      animation: userPulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    @keyframes userPulse {
      0% { box-shadow: 0 0 0 0 rgba(10, 132, 255, 0.7); }
      70% { box-shadow: 0 0 0 15px rgba(10, 132, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(10, 132, 255, 0); }
    }

    .loading-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .loading-overlay.hidden { opacity: 0; pointer-events: none; }
  </style>
</head>
<body>
  <div class="loading-overlay" id="loadingOverlay">Map Loading...</div>
  <div id="map"></div>
  <script>
    try {
      var map = tt.map({
        key: '${TOMTOM_API_KEY}',
        container: 'map',
        center: [${center.lng}, ${center.lat}],
        zoom: ${zoom},
        style: { map: 'basic_night' }
      });

      map.on('load', function() {
        document.getElementById('loadingOverlay').classList.add('hidden');
        ${markersJS}
        ${userMarkerJS}
      });
    } catch(e) { console.error(e); }
  </script>
</body>
</html>`;
};

const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  drivers = [],
  userLocation,
  center: propCenter,
  zoom = DEFAULT_ZOOM,
}) => {
  const mapCenter = React.useMemo(() => {
    if (propCenter) return propCenter;
    if (userLocation) {
      return { lat: userLocation.latitude, lng: userLocation.longitude };
    }
    return DEFAULT_CENTER;
  }, [propCenter, userLocation]);

  const mapHTML = React.useMemo(() =>
    generateMapHTML(drivers, userLocation, mapCenter, zoom),
    [drivers, userLocation, mapCenter, zoom]
  );

  if (Platform.OS === 'web') {
    // On web, render the map directly in an iframe using a data URI
    return (
      <View style={styles.mapContainer}>
        <iframe
          srcDoc={mapHTML}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 16,
          } as any}
          title="CampusPool Map"
          allow="geolocation"
        />
      </View>
    );
  }

  // On native, use WebView
  const WebView = require('react-native-webview').WebView;
  return (
    <View style={styles.mapContainer}>
      <WebView
        source={{ html: mapHTML }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.orange} />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    minHeight: 250,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default MapPlaceholder;