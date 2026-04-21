import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import {
  Coordinates,
  PlaceSuggestion,
  ensureLocationPermission,
  getCurrentPosition,
  placeDetails,
  placesAutocomplete,
  reverseGeocodeLocal,
} from '@/lib/location-service';

type Tab = 'current' | 'search' | 'map';

export type LocationSendPayload =
  | {
      kind: 'snapshot';
      latitude: number;
      longitude: number;
      label?: string;
    }
  | {
      kind: 'live';
      durationSec: number;
      initial: Coordinates;
      label?: string;
    };

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (payload: LocationSendPayload) => void;
}

const LIVE_DURATION_OPTIONS = [
  { label: '15 minutes', seconds: 15 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
  { label: '8 hours', seconds: 8 * 60 * 60 },
];

export function LocationPickerModal({
  visible,
  onClose,
  onSend,
}: LocationPickerModalProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('current');

  // Current location
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [sessionToken] = useState(() => randomToken());
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map picker
  const [region, setRegion] = useState<Region | null>(null);
  const [pickerLabel, setPickerLabel] = useState<string | null>(null);

  // Live duration picker
  const [showLiveOptions, setShowLiveOptions] = useState(false);

  // Load current position when modal opens
  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoadingCurrent(true);
      const ok = await ensureLocationPermission();
      if (!ok) {
        setLoadingCurrent(false);
        Alert.alert(
          'Permission needed',
          'Enable location access in settings to share your location.',
        );
        return;
      }
      const coords = await getCurrentPosition();
      setCurrentCoords(coords);
      if (coords) {
        setRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        const label = await reverseGeocodeLocal(coords.latitude, coords.longitude);
        setCurrentLabel(label);
        setPickerLabel(label);
      }
      setLoadingCurrent(false);
    })();
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'search') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await placesAutocomplete(query, sessionToken);
      setSuggestions(results);
      setSearching(false);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, tab, sessionToken]);

  const handleSelectSuggestion = useCallback(
    async (s: PlaceSuggestion) => {
      const details = await placeDetails(s.placeId, sessionToken);
      if (!details) {
        Alert.alert('Error', 'Could not load place details.');
        return;
      }
      onSend({
        kind: 'snapshot',
        latitude: details.latitude,
        longitude: details.longitude,
        label: details.name || details.address || s.description,
      });
      onClose();
    },
    [onSend, onClose, sessionToken],
  );

  const sendCurrent = () => {
    if (!currentCoords) return;
    onSend({
      kind: 'snapshot',
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      label: currentLabel ?? undefined,
    });
    onClose();
  };

  const sendPicked = async () => {
    if (!region) return;
    const label =
      pickerLabel ??
      (await reverseGeocodeLocal(region.latitude, region.longitude));
    onSend({
      kind: 'snapshot',
      latitude: region.latitude,
      longitude: region.longitude,
      label: label ?? undefined,
    });
    onClose();
  };

  const startLiveShare = (durationSec: number) => {
    if (!currentCoords) return;
    onSend({
      kind: 'live',
      durationSec,
      initial: currentCoords,
      label: currentLabel ?? undefined,
    });
    setShowLiveOptions(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <IconSymbol size={24} name="xmark" color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share Location</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          <TabButton label="Current" active={tab === 'current'} onPress={() => setTab('current')} colors={colors} />
          <TabButton label="Search" active={tab === 'search'} onPress={() => setTab('search')} colors={colors} />
          <TabButton label="Pick on map" active={tab === 'map'} onPress={() => setTab('map')} colors={colors} />
        </View>

        {/* Tab content */}
        {tab === 'current' && (
          <CurrentTab
            colors={colors}
            loading={loadingCurrent}
            coords={currentCoords}
            label={currentLabel}
            onSend={sendCurrent}
            onStartLive={() => setShowLiveOptions(true)}
          />
        )}

        {tab === 'search' && (
          <SearchTab
            colors={colors}
            query={query}
            setQuery={setQuery}
            suggestions={suggestions}
            searching={searching}
            onSelect={handleSelectSuggestion}
          />
        )}

        {tab === 'map' && (
          <MapTab
            colors={colors}
            region={region}
            setRegion={setRegion}
            onSend={sendPicked}
            label={pickerLabel}
          />
        )}

        {/* Live duration picker sheet */}
        <Modal
          visible={showLiveOptions}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLiveOptions(false)}
        >
          <TouchableOpacity
            style={styles.liveOverlay}
            activeOpacity={1}
            onPress={() => setShowLiveOptions(false)}
          >
            <View style={[styles.liveSheet, { backgroundColor: colors.card }]}>
              <Text style={[styles.liveTitle, { color: colors.text }]}>
                Share Live Location
              </Text>
              <Text style={[styles.liveSubtitle, { color: colors.textSecondary }]}>
                Your location updates in real time until the timer ends.
              </Text>
              {LIVE_DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.seconds}
                  style={[styles.liveOption, { borderColor: colors.border }]}
                  onPress={() => startLiveShare(opt.seconds)}
                >
                  <Text style={[styles.liveOptionText, { color: colors.text }]}>
                    {opt.label}
                  </Text>
                  <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

// ---------- Subcomponents ----------

function TabButton({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabBtn,
        active && { borderBottomColor: colors.gold, borderBottomWidth: 2 },
      ]}
    >
      <Text
        style={[
          styles.tabBtnText,
          { color: active ? colors.gold : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CurrentTab({
  colors,
  loading,
  coords,
  label,
  onSend,
  onStartLive,
}: {
  colors: any;
  loading: boolean;
  coords: Coordinates | null;
  label: string | null;
  onSend: () => void;
  onStartLive: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.centeredFill}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
          Finding your location…
        </Text>
      </View>
    );
  }

  if (!coords) {
    return (
      <View style={styles.centeredFill}>
        <IconSymbol size={48} name="location.slash" color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
          Location unavailable.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.previewMap}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        pointerEvents="none"
      >
        <Marker coordinate={{ latitude: coords.latitude, longitude: coords.longitude }} />
      </MapView>

      <View style={[styles.actionCard, { backgroundColor: colors.card }]}>
        <View style={styles.actionRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.gold + '22' }]}>
            <IconSymbol size={22} name="location.fill" color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Send your current location</Text>
            {label && (
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {label}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.gold }]}
            onPress={onSend}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionRow} onPress={onStartLive}>
          <View style={[styles.iconCircle, { backgroundColor: '#E74C3C22' }]}>
            <IconSymbol size={22} name="dot.radiowaves.left.and.right" color="#E74C3C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Share live location</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              Updates in real time for a set duration
            </Text>
          </View>
          <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SearchTab({
  colors,
  query,
  setQuery,
  suggestions,
  searching,
  onSelect,
}: {
  colors: any;
  query: string;
  setQuery: (v: string) => void;
  suggestions: PlaceSuggestion[];
  searching: boolean;
  onSelect: (s: PlaceSuggestion) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <IconSymbol size={18} name="magnifyingglass" color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search places"
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
          autoFocus
        />
        {searching && <ActivityIndicator size="small" color={colors.gold} />}
      </View>
      <FlatList
        data={suggestions}
        keyExtractor={(s) => s.placeId}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !searching && query.trim() ? (
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>No results</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(item)}
          >
            <IconSymbol size={18} name="mappin" color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.suggestionPrimary, { color: colors.text }]}>{item.primary}</Text>
              {!!item.secondary && (
                <Text style={[styles.suggestionSecondary, { color: colors.textSecondary }]}>
                  {item.secondary}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function MapTab({
  colors,
  region,
  setRegion,
  onSend,
  label,
}: {
  colors: any;
  region: Region | null;
  setRegion: (r: Region) => void;
  onSend: () => void;
  label: string | null;
}) {
  if (!region) {
    return (
      <View style={styles.centeredFill}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
      />
      {/* Fixed center marker (WhatsApp-style: map pans under the pin) */}
      <View pointerEvents="none" style={styles.centerPin}>
        <IconSymbol size={40} name="mappin.circle.fill" color="#E74C3C" />
      </View>
      <View style={[styles.bottomBar, { backgroundColor: colors.card }]}>
        <Text style={[styles.bottomLabel, { color: colors.text }]} numberOfLines={1}>
          {label || `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`}
        </Text>
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.gold }]} onPress={onSend}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------- Helpers ----------

function randomToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.select({ ios: 54, android: 16 }),
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnText: { fontSize: 14, fontWeight: '600' },
  centeredFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewMap: { height: 220, width: '100%' },
  actionCard: {
    margin: 16,
    borderRadius: 16,
    padding: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionSubtitle: { fontSize: 12, marginTop: 2 },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  emptyHint: { textAlign: 'center', marginTop: 24, fontSize: 13 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionPrimary: { fontSize: 15, fontWeight: '600' },
  suggestionSecondary: { fontSize: 12, marginTop: 2 },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40, // account for pin anchor at bottom
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.select({ ios: 32, android: 16 }),
  },
  bottomLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  liveOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  liveSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  liveTitle: { fontSize: 18, fontWeight: '700' },
  liveSubtitle: { fontSize: 13, marginBottom: 4 },
  liveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveOptionText: { fontSize: 15, fontWeight: '600' },
});
