/**
 * WebViewPlayer
 * Full-screen in-app player that auto-advances through a list of social video
 * URLs every N seconds. When a URL can't be embedded or fails to load, the
 * player auto-skips to the next one.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { toEmbedUrl, PLATFORM_DURATIONS, type EmbedPlatform } from '@/utils/embed-url';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const PLATFORM_COLORS: Record<EmbedPlatform, string> = {
  tiktok: '#ff0050',
  youtube: '#ff0000',
  instagram: '#e1306c',
  facebook: '#1877f2',
  unknown: '#888',
};

export const VIDEO_DURATION_MS = 10_000;

interface WebViewPlayerProps {
  visible: boolean;
  urls: string[];
  startIndex?: number;
  durationMs?: number;
  loop?: boolean;
  mute?: boolean;
  onClose: () => void;
}

export function WebViewPlayer({
  visible,
  urls,
  startIndex = 0,
  durationMs = VIDEO_DURATION_MS,
  loop = true,
  mute: initialMute = false,
  onClose,
}: WebViewPlayerProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(initialMute);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const embedInfos = useMemo(() => urls.map((u) => toEmbedUrl(u, { mute: muted })), [urls, muted]);
  const current = embedInfos[index];

  // Per-platform duration for current item
  const currentDurationSec = useMemo(() => {
    if (!current) return Math.ceil(durationMs / 1000);
    return PLATFORM_DURATIONS[current.platform] || Math.ceil(durationMs / 1000);
  }, [current, durationMs]);

  const [secondsLeft, setSecondsLeft] = useState(currentDurationSec);

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      setPaused(false);
      setMuted(initialMute);
    }
  }, [visible, startIndex]);

  // Reset timer & progress when track changes
  useEffect(() => {
    if (!visible) return;
    if (current && current.embedUrl === null) {
      // Skip unsupported URL immediately
      const t = setTimeout(() => advance(), 300);
      return () => clearTimeout(t);
    }
    setLoading(true);
    setSecondsLeft(currentDurationSec);
    progressAnim.setValue(0);
  }, [index, visible, currentDurationSec]);

  // Animate progress bar
  useEffect(() => {
    if (!visible || paused) {
      progressAnim.stopAnimation();
      return;
    }
    const remaining = (secondsLeft / currentDurationSec);
    progressAnim.setValue(1 - remaining);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: secondsLeft * 1000,
      useNativeDriver: false,
    }).start();
  }, [visible, paused, secondsLeft, currentDurationSec]);

  // Countdown timer
  useEffect(() => {
    if (!visible || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s: number) => {
        if (s <= 1) {
          advance();
          return currentDurationSec;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, paused, index, currentDurationSec]);

  const advance = () => {
    if (index + 1 >= urls.length) {
      if (loop) {
        setIndex(0);
        return;
      }
      // Finished playlist — defer onClose to avoid setState during render
      setTimeout(() => onClose(), 0);
      return;
    }
    setIndex((i) => Math.min(i + 1, urls.length - 1));
  };

  const prev = () => {
    if (index === 0 && loop) {
      setIndex(urls.length - 1);
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
  };

  const platformColor = current ? PLATFORM_COLORS[current.platform] : '#888';

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <IconSymbol size={36} name="chevron.left" color={colors.gold} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Video {index + 1} of {urls.length}
            </Text>
            <View style={styles.headerMeta}>
              <View style={[styles.platformPill, { borderColor: platformColor }]}>
                <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
                <Text style={[styles.platformPillText, { color: platformColor }]}>
                  {(current?.platform ?? '—').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.headerSub}>
                {paused ? 'Paused' : `Next in ${secondsLeft}s`}
              </Text>
              {loop && <Text style={styles.loopBadge}>LOOP</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={() => setMuted((m) => !m)} style={styles.headerBtn}>
            <IconSymbol
              size={22}
              name={muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
              color={colors.gold}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPaused((p) => !p)} style={styles.headerBtn}>
            <IconSymbol
              size={28}
              name={paused ? 'play.fill' : 'pause.fill'}
              color={colors.gold}
            />
          </TouchableOpacity>
        </View>

        {/* Per-item timer bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: platformColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Playlist progress (small dots) */}
        <View style={styles.dotsRow}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? platformColor : '#333',
                  width: i === index ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Video */}
        <View style={styles.videoWrap}>
          {current?.embedUrl ? (
            <WebView
              key={`${index}-${current.embedUrl}`}
              source={{ uri: current.embedUrl }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => advance()}
              onHttpError={() => advance()}
            />
          ) : (
            <View style={styles.unsupported}>
              <Text style={styles.unsupportedText}>
                Cannot embed this video — skipping…
              </Text>
            </View>
          )}
          {loading && current?.embedUrl && (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={prev}
            style={styles.ctrlBtn}
          >
            <Text style={styles.ctrlText}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaused((p) => !p)}
            style={[styles.ctrlBtn, styles.ctrlPrimary, { backgroundColor: colors.gold }]}
          >
            <Text style={[styles.ctrlText, { color: '#000', fontWeight: '700' }]}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={advance} style={styles.ctrlBtn}>
            <Text style={styles.ctrlText}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  headerSub: { color: '#bbb', fontSize: 12 },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  platformDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  platformPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  loopBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00e5ff',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#222',
    marginHorizontal: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  videoWrap: { flex: 1, backgroundColor: '#000', marginTop: 4 },
  webview: { flex: 1, backgroundColor: '#000' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unsupportedText: { color: '#fff', textAlign: 'center' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 30,
    gap: 20,
  },
  ctrlBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  ctrlPrimary: {
    paddingHorizontal: 22,
  },
  ctrlText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
