/**
 * WebViewPlayer
 * Full-screen in-app player that auto-advances through a list of social video
 * URLs every N seconds. When a URL can't be embedded or fails to load, the
 * player auto-skips to the next one.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { toEmbedUrl } from '@/utils/embed-url';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

export const VIDEO_DURATION_MS = 10_000;

interface WebViewPlayerProps {
  visible: boolean;
  urls: string[];
  startIndex?: number;
  durationMs?: number;
  onClose: () => void;
}

export function WebViewPlayer({
  visible,
  urls,
  startIndex = 0,
  durationMs = VIDEO_DURATION_MS,
  onClose,
}: WebViewPlayerProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(startIndex);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const embedInfos = useMemo(() => urls.map(toEmbedUrl), [urls]);
  const current = embedInfos[index];

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      setPaused(false);
      setSecondsLeft(Math.ceil(durationMs / 1000));
    }
  }, [visible, startIndex, durationMs]);

  // Auto-skip if current URL can't be embedded
  useEffect(() => {
    if (!visible) return;
    if (current && current.embedUrl === null) {
      // Skip unsupported URL immediately
      const t = setTimeout(() => advance(), 300);
      return () => clearTimeout(t);
    }
    setLoading(true);
    setSecondsLeft(Math.ceil(durationMs / 1000));
  }, [index, visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          advance();
          return Math.ceil(durationMs / 1000);
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, paused, index]);

  const advance = () => {
    if (index + 1 >= urls.length) {
      // Finished playlist — defer onClose to avoid setState during render
      setTimeout(() => onClose(), 0);
      return;
    }
    setIndex((i) => Math.min(i + 1, urls.length - 1));
  };

  const prev = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

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
            <Text style={styles.headerSub}>
              {paused ? 'Paused' : `Next in ${secondsLeft}s`} · {current?.platform ?? '—'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setPaused((p) => !p)} style={styles.headerBtn}>
            <IconSymbol
              size={28}
              name={paused ? 'play.fill' : 'pause.fill'}
              color={colors.gold}
            />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.gold,
                width: `${((index + 1) / urls.length) * 100}%`,
              },
            ]}
          />
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
            disabled={index === 0}
            style={[styles.ctrlBtn, { opacity: index === 0 ? 0.4 : 1 }]}
          >
            <Text style={styles.ctrlText}>← Prev</Text>
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
            <Text style={styles.ctrlText}>Next →</Text>
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
  headerSub: { color: '#bbb', fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 3,
    backgroundColor: '#222',
    marginHorizontal: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  videoWrap: { flex: 1, backgroundColor: '#000', marginTop: 8 },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 30,
    gap: 10,
  },
  ctrlBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  ctrlPrimary: {
    paddingHorizontal: 22,
  },
  ctrlText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
