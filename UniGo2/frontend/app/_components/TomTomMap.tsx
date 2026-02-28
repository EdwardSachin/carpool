import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, Text, Dimensions } from 'react-native';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../_constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const TOMTOM_API_KEY = 'CHKrCosQhhodrT8UO4bFl0M3v3e8GDJL';

const NHCE = {
  lat: 12.9591,
  lng: 77.6974,
  name: 'New Horizon College of Engineering',
};

const FALLBACK_LOCATION = {
  lat: 12.9352,
  lng: 77.6245,
};

type RidePhase = 'idle' | 'requesting' | 'accepted' | 'driver_approaching' | 'en_route';

interface TomTomMapProps {
  mode?: 'rider' | 'driver';
  height?: number;
  availableDrivers?: { id: string, name: string }[];
  selectedDriverId?: string | null;
  ridePhase?: string;
  // Campus Map compatibility
  showPickupPoints?: boolean;
  showRoute?: boolean;
  showTraffic?: boolean;
  pickupPoints?: any[];
  onPickupSelect?: (id: string) => void;
}

export const TomTomMap: React.FC<TomTomMapProps> = ({
  mode = 'rider',
  height = 400,
  availableDrivers = [],
  selectedDriverId = null,
  ridePhase = 'idle',
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(FALLBACK_LOCATION);
  const [webViewRef, setWebViewRef] = useState<any>(null);

  useEffect(() => {
    // Disabled location fetching to prevent Mobile app crash 
    if (Platform.OS === 'web') return;
    setUserLocation(FALLBACK_LOCATION);
  }, []);

  // Update status banner / route when props change
  useEffect(() => {
    if (!webViewRef && Platform.OS !== 'web') return; // For WebView context
    const iframeWindow = Platform.OS === 'web' ? (document.getElementById('map-iframe') as any)?.contentWindow : null;

    const runJs = (js: string) => {
      if (Platform.OS === 'web' && iframeWindow) {
        iframeWindow.postMessage({ type: 'eval', code: js }, '*');
      } else if (webViewRef) {
        webViewRef.injectJavaScript(js + "; true;");
      }
    };

    if (ridePhase === 'idle') {
      runJs(`if (typeof resetMap === 'function') resetMap();`);
    } else if (ridePhase === 'requesting' || ridePhase === 'accepted') {
      const isReq = ridePhase === 'requesting';
      runJs(`if (typeof updateStatusBanner === 'function') updateStatusBanner('${isReq ? 'requesting' : 'accepted'}', '${selectedDriverId}');`);
      if (ridePhase === 'accepted') {
        runJs(`if (typeof showAcceptedRoute === 'function') showAcceptedRoute('${selectedDriverId}');`);
      }
    } else if (ridePhase === 'en_route') {
      runJs(`if (typeof updateStatusBanner === 'function') updateStatusBanner('en_route', '${selectedDriverId}');`);
      runJs(`if (typeof showAcceptedRoute === 'function') showAcceptedRoute('${selectedDriverId}');`);
    }
  }, [ridePhase, selectedDriverId, webViewRef]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: any) => {
    // We removed internal map clicking, so no messages returning
  }, []);

  // Wrap JS listener for iframe (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => { /* handle msg */ };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  // Build the map HTML
  const mapHtml = useMemo(() => {
    if (!userLocation) return '';

    // Generate deterministic locations for drivers based on ID
    const driversToRender = availableDrivers.map((d, index) => {
      const latOffset = (index % 2 === 0 ? 1 : -1) * (0.003 + (index % 5) * 0.001);
      const lngOffset = (index % 3 === 0 ? 1 : -1) * (0.004 + (index % 4) * 0.001);
      return {
        id: d.id,
        name: d.name,
        lat: userLocation.lat + latOffset,
        lng: userLocation.lng + lngOffset,
      };
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" type="text/css" href="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css">
        <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
          #map { width: 100%; height: 100%; }

          .rider-marker {
            width: 20px; height: 20px;
            background: #FF7F50;
            border-radius: 50%;
            border: 3px solid #fff;
            animation: pulse 2s infinite;
          }

          .driver-marker {
            width: 18px; height: 18px;
            background: #EF4444;
            border-radius: 50%;
            border: 2px solid #fff;
            transition: all 0.3s;
          }

          .driver-marker.selected {
            background: #EAB308;
            border: 3px solid #fff;
            transform: scale(1.3);
            z-index: 100;
          }

          .nhce-dot {
            width: 24px; height: 24px;
            background: #3B82F6;
            border-radius: 50%;
            border: 2px solid #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; color: white;
          }

          .label {
            margin-top: 3px; padding: 2px 6px;
            background: rgba(0,0,0,0.8);
            border-radius: 6px; font-size: 10px; color: white;
            white-space: nowrap; text-align: center; font-family: sans-serif;
          }

          .status-banner {
            position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
            padding: 8px 16px; border-radius: 20px; font-size: 12px;
            font-weight: bold; color: white; display: none; z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-family: sans-serif;
          }

          .legend {
            position: absolute; bottom: 10px; left: 10px;
            background: rgba(0,0,0,0.85); padding: 8px 12px;
            border-radius: 10px; font-size: 11px; color: white;
            z-index: 1000; font-family: sans-serif;
          }

          .legend-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
          .legend-dot { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid white; }

          @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(255,127,80,0.8); }
            50% { transform: scale(1.2); box-shadow: 0 0 20px rgba(255,127,80,1); }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="statusBanner" class="status-banner"></div>
        <div class="legend" id="legend">
          <div class="legend-item"><div class="legend-dot" style="background:#FF7F50"></div><span>You</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:#EF4444"></div><span>Drivers</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:#3B82F6"></div><span>NHCE</span></div>
        </div>
        <script>
          window.addEventListener("message", function(event) {
            if (event.data && event.data.type === 'eval') { eval(event.data.code); }
          });

          var userLat = ${userLocation.lat};
          var userLng = ${userLocation.lng};
          var nhceLat = ${NHCE.lat};
          var nhceLng = ${NHCE.lng};
          var drivers = ${JSON.stringify(driversToRender)};
          
          var driverMarkers = {};
          var currentRouteLayers = false;

          var map = tt.map({
            key: '${TOMTOM_API_KEY}',
            container: 'map',
            center: [userLng, userLat],
            zoom: 13.5,
            style: 'https://api.tomtom.com/style/1/style/22.2.1-*?map=basic_night&poi=poi_main'
          });

          map.addControl(new tt.NavigationControl());

          map.on('load', function() {
            // Rider
            var riderEl = document.createElement('div');
            riderEl.style = "display:flex;flex-direction:column;align-items:center;";
            riderEl.innerHTML = '<div class="rider-marker"></div><div class="label">You</div>';
            new tt.Marker({ element: riderEl }).setLngLat([userLng, userLat]).addTo(map);

            // NHCE
            var nhceEl = document.createElement('div');
            nhceEl.style = "display:flex;flex-direction:column;align-items:center;";
            nhceEl.innerHTML = '<div class="nhce-dot">🎓</div><div class="label">NHCE</div>';
            new tt.Marker({ element: nhceEl }).setLngLat([nhceLng, nhceLat]).addTo(map);

            // Drivers
            drivers.forEach(function(driver) {
              var driverEl = document.createElement('div');
              driverEl.style = "display:flex;flex-direction:column;align-items:center;";
              driverEl.innerHTML = '<div class="driver-marker" id="dot-' + driver.id + '"></div><div class="label">' + driver.name + '</div>';
              
              var marker = new tt.Marker({ element: driverEl }).setLngLat([driver.lng, driver.lat]).addTo(map);
              driverMarkers[driver.id] = { marker: marker, data: driver };
            });

            var bounds = new tt.LngLatBounds();
            bounds.extend([userLng, userLat]);
            bounds.extend([nhceLng, nhceLat]);
            drivers.forEach(function(d) { bounds.extend([d.lng, d.lat]); });
            map.fitBounds(bounds, { padding: 50 });
          });

          function resetMap() {
            if (currentRouteLayers) {
              try { map.removeLayer('route-yellow'); } catch(e) {}
              try { map.removeSource('source-yellow'); } catch(e) {}
              try { map.removeLayer('route-red'); } catch(e) {}
              try { map.removeSource('source-red'); } catch(e) {}
            }
            currentRouteLayers = false;
            Object.keys(driverMarkers).forEach(function(id) {
               var el = document.getElementById('dot-' + id);
               if(el) el.classList.remove('selected');
               driverMarkers[id].marker.getElement().style.display = 'flex';
            });
            document.getElementById('statusBanner').style.display = 'none';

            var leg = document.getElementById('legend');
            leg.innerHTML = '<div class="legend-item"><div class="legend-dot" style="background:#FF7F50"></div><span>You</span></div>' +
                            '<div class="legend-item"><div class="legend-dot" style="background:#EF4444"></div><span>Drivers</span></div>' +
                            '<div class="legend-item"><div class="legend-dot" style="background:#3B82F6"></div><span>NHCE</span></div>';
            
            var bounds = new tt.LngLatBounds();
            bounds.extend([userLng, userLat]); bounds.extend([nhceLng, nhceLat]);
            drivers.forEach(function(d) { bounds.extend([d.lng, d.lat]); });
            map.fitBounds(bounds, { padding: 50 });
          }

          function drawSegment(start, end, colorId, colorHex) {
             var sourceId = 'source-' + colorId;
             var layerId = 'route-' + colorId;
             var url = 'https://api.tomtom.com/routing/1/calculateRoute/'
               + start[0] + ',' + start[1] + ':' + end[0] + ',' + end[1]
               + '/json?key=${TOMTOM_API_KEY}&routeType=fastest&traffic=true';
               
             return fetch(url).then(function(res) { return res.json(); }).then(function(data) {
                var pts = [[start[1], start[0]], [end[1], end[0]]];
                if (data.routes && data.routes.length > 0) {
                  pts = data.routes[0].legs[0].points.map(function(p) { return [p.longitude, p.latitude]; });
                }
                map.addSource(sourceId, { type:'geojson', data: { type:'Feature', properties:{}, geometry: {type:'LineString', coordinates:pts} }});
                map.addLayer({ id: layerId, type: 'line', source: sourceId, layout: {'line-join':'round', 'line-cap':'round'}, paint: { 'line-color': colorHex, 'line-width': 6, 'line-opacity': 0.95 } });
                return pts;
             }).catch(function() {
                var pts = [[start[1], start[0]], [end[1], end[0]]];
                map.addSource(sourceId, { type:'geojson', data: { type:'Feature', properties:{}, geometry: {type:'LineString', coordinates:pts} }});
                map.addLayer({ id: layerId, type: 'line', source: sourceId, layout: {'line-join':'round', 'line-cap':'round'}, paint: { 'line-color': colorHex, 'line-width': 6, 'line-opacity': 0.95 } });
                return pts;
             });
          }

          function showAcceptedRoute(driverId) {
            if (currentRouteLayers) resetMap();
            var dInfo = driverMarkers[driverId];
            if (!dInfo) return;

            // Hide other drivers
            Object.keys(driverMarkers).forEach(function(id) {
              if (id !== driverId) driverMarkers[id].marker.getElement().style.display = 'none';
            });
            var dot = document.getElementById('dot-' + driverId);
            if (dot) dot.classList.add('selected');

            // Draw Drivers -> Rider (Yellow)
            var p1 = drawSegment([dInfo.data.lat, dInfo.data.lng], [userLat, userLng], 'yellow', '#EAB308');
            // Draw Rider -> NHCE (Red)
            var p2 = drawSegment([userLat, userLng], [nhceLat, nhceLng], 'red', '#EF4444');

            Promise.all([p1, p2]).then(function(results) {
               currentRouteLayers = true;
               var bounds = new tt.LngLatBounds();
               results[0].forEach(function(p) { bounds.extend(p); });
               results[1].forEach(function(p) { bounds.extend(p); });
               map.fitBounds(bounds, { padding: 60 });
            });

            // Update legend for colored routes
            var leg = document.getElementById('legend');
            leg.innerHTML = '<div class="legend-item"><div class="legend-dot" style="background:#EAB308"></div><span>Driver</span></div>' +
                            '<div class="legend-item"><div class="legend-dot" style="background:#FF7F50"></div><span>You</span></div>' +
                            '<div class="legend-item"><div class="legend-dot" style="background:#3B82F6"></div><span>NHCE</span></div>' +
                            '<div class="legend-item"><div style="width:20px;height:4px;background:#EAB308;border-radius:2px"></div><span>Driver to You</span></div>'+
                            '<div class="legend-item"><div style="width:20px;height:4px;background:#EF4444;border-radius:2px"></div><span>You to Campus</span></div>';
          }

          function updateStatusBanner(phase, driverId) {
            var banner = document.getElementById('statusBanner');
            var name = driverMarkers[driverId] ? driverMarkers[driverId].data.name : 'Driver';
            banner.style.display = 'block';
            if (phase === 'requesting') {
              banner.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
              banner.textContent = '⏳ Requesting...';
            } else if (phase === 'accepted') {
              banner.style.background = 'linear-gradient(135deg, #22C55E, #16A34A)';
              banner.textContent = '✅ ' + name + ' accepted your ride!';
            } else if (phase === 'en_route') {
              banner.style.background = 'linear-gradient(135deg, #3B82F6, #1D4ED8)';
              banner.textContent = '🚗 ' + name + ' is en route!';
            } else {
              banner.style.display = 'none';
            }
          }
        </script>
      </body>
      </html>
    `;
  }, [userLocation, availableDrivers]);

  if (!userLocation) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: COLORS.white }}>Loading location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { height }]}>
      <View style={[styles.container, { height }]}>
        {Platform.OS === 'web' ? (
          <iframe
            id="map-iframe"
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <View style={[{ height, backgroundColor: COLORS.slate900, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
            <Ionicons name="map" size={48} color={COLORS.orange} />
            <Text style={{ color: COLORS.white, marginTop: 10, fontSize: 16 }}>Mobile Map Unavailable</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 5, fontSize: 13, textAlign: 'center' }}>
              We disabled react-native-webview to fix the crash. For the full route routing experience, use the Web platform!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  container: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.slate900,
    borderWidth: 1,
    borderColor: COLORS.glassWhiteBorder,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.slate900,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default TomTomMap;
