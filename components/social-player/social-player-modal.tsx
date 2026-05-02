/**
 * Social Player Modal
 * Displays and plays social media videos in sequence
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WebViewPlayer } from '@/components/social-player/webview-player';
import { startPlaylist } from '@/utils/playlist-scheduler';
import {
  parseSocialUrl,
  type ParsedSocialUrl,
  getPlatformDisplayName,
  getPlatformEmoji,
  isValidShortFormVideo,
} from '@/utils/social-url-parser';
import {
  openSocialVideo,
  isAppInstalled,
  getAppStoreUrl,
  type OpenVideoResult,
} from '@/utils/social-deep-link';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SocialPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  urls: string[];
  title?: string;
}

export function SocialPlayerModal({
  visible,
  onClose,
  urls,
  title = 'Social Playlist',
}: SocialPlayerModalProps) {
  const { colors } = useTheme();
  const [parsedVideos, setParsedVideos] = useState<ParsedSocialUrl[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appStatus, setAppStatus] = useState<Record<string, boolean>>({});
  const [lastResult, setLastResult] = useState<OpenVideoResult | null>(null);
  const [showWebPlayer, setShowWebPlayer] = useState(false);

  // Parse URLs when modal opens
  useEffect(() => {
    if (visible && urls.length > 0) {
      const validVideos = urls
        .map(parseSocialUrl)
        .filter((v: ParsedSocialUrl) => isValidShortFormVideo(v.originalUrl));
      setParsedVideos(validVideos);
      setCurrentIndex(0);
      setIsPlaying(false);
      setLastResult(null);

      // Check which apps are installed
      checkInstalledApps(validVideos);
    }
  }, [visible, urls]);

  // Check if native apps are installed
  const checkInstalledApps = async (videos: ParsedSocialUrl[]) => {
    const status: Record<string, boolean> = {};
    
    for (const video of videos) {
      const platform = video.platform;
      if (!status[platform] && video.deepLinkUrl) {
        status[platform] = await isAppInstalled(video.deepLinkUrl);
      }
    }
    
    setAppStatus(status);
  };

  // Play current video
  const playCurrent = useCallback(async () => {
    if (currentIndex >= parsedVideos.length) return;

    const video = parsedVideos[currentIndex];
    setLoading(true);
    setIsPlaying(true);

    try {
      const result = await openSocialVideo(video.originalUrl, {
        preferNative: true,
        autoPlay: true,
      });
      
      setLastResult(result);
      
      if (!result.success) {
        console.error('Failed to open video:', result.error);
      }
    } catch (error) {
      console.error('Error playing video:', error);
      setLastResult({
        success: false,
        method: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [currentIndex, parsedVideos]);

  // Play all videos in sequence
  const playAll = useCallback(async () => {
    setCurrentIndex(0);
    
    for (let i = 0; i < parsedVideos.length; i++) {
      setCurrentIndex(i);
      await playCurrent();
      
      // Small delay between videos to allow app transition
      if (i < parsedVideos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    
    setIsPlaying(false);
  }, [parsedVideos, playCurrent]);

  // Go to next video
  const nextVideo = () => {
    if (currentIndex < parsedVideos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setLastResult(null);
    }
  };

  // Go to previous video
  const prevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setLastResult(null);
    }
  };

  // Get current video
  const currentVideo = parsedVideos[currentIndex];

  // Count videos by platform
  const platformCounts = parsedVideos.reduce((acc, video) => {
    acc[video.platform] = (acc[video.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <IconSymbol size={36} name="chevron.left" color={colors.gold} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Video Count Summary */}
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {parsedVideos.length} videos •
            {Object.entries(platformCounts).map(([platform, count]) => (
              <Text key={platform}>
                {' '}
                {getPlatformEmoji(platform as any)} {count}
              </Text>
            ))}
          </Text>
        </View>

        {/* Current Video Display */}
        {currentVideo && (
          <View style={styles.currentVideoContainer}>
            <View
              style={[
                styles.platformBadge,
                { backgroundColor: colors.gold + '20' },
              ]}
            >
              <Text style={styles.platformEmoji}>
                {getPlatformEmoji(currentVideo.platform)}
              </Text>
              <Text style={[styles.platformName, { color: colors.text }]}>
                {getPlatformDisplayName(currentVideo.platform)}
              </Text>
            </View>

            <Text
              style={[styles.videoUrl, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {currentVideo.originalUrl}
            </Text>

            {/* App Status */}
            {currentVideo.deepLinkUrl && (
              <Text
                style={[
                  styles.appStatus,
                  {
                    color: appStatus[currentVideo.platform]
                      ? '#4CAF50'
                      : '#FF9800',
                  },
                ]}
              >
                {appStatus[currentVideo.platform]
                  ? '✓ Native app installed'
                  : '⚠ Will open in browser'}
              </Text>
            )}

            {/* Last Result */}
            {lastResult && (
              <Text
                style={[
                  styles.resultText,
                  {
                    color: lastResult.success ? '#4CAF50' : '#F44336',
                  },
                ]}
              >
                {lastResult.success
                  ? `Opened via ${lastResult.method}`
                  : `Error: ${lastResult.error}`}
              </Text>
            )}
          </View>
        )}

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            Video {currentIndex + 1} of {parsedVideos.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.gold,
                  width: `${((currentIndex + 1) / parsedVideos.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={prevVideo}
            disabled={currentIndex === 0}
            style={[
              styles.controlButton,
              { opacity: currentIndex === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.controlText, { color: colors.text }]}>
              ← Prev
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowWebPlayer(true)}
            disabled={parsedVideos.length === 0}
            style={[
              styles.playButton,
              { backgroundColor: colors.gold },
            ]}
          >
            <Text style={styles.playButtonText}>▶ Play Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextVideo}
            disabled={currentIndex >= parsedVideos.length - 1}
            style={[
              styles.controlButton,
              {
                opacity:
                  currentIndex >= parsedVideos.length - 1 ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.controlText, { color: colors.text }]}>
              Next →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Play All Button - native apps with notification nudge */}
        {parsedVideos.length > 1 && (
          <TouchableOpacity
            onPress={() => startPlaylist(parsedVideos.map(v => v.originalUrl))}
            disabled={loading}
            style={[
              styles.playAllButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.playAllText, { color: colors.text }]}>
              🎬 Play All {parsedVideos.length} in Native Apps
            </Text>
          </TouchableOpacity>
        )}

        {/* Video List */}
        <ScrollView style={styles.videoList} showsVerticalScrollIndicator={false}>
          <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
            Playlist
          </Text>
          {parsedVideos.map((video, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentIndex(index);
                setLastResult(null);
              }}
              style={[
                styles.videoItem,
                {
                  backgroundColor:
                    index === currentIndex
                      ? colors.gold + '20'
                      : colors.card,
                  borderColor:
                    index === currentIndex ? colors.gold : colors.border,
                },
              ]}
            >
              <Text style={styles.videoEmoji}>
                {getPlatformEmoji(video.platform)}
              </Text>
              <View style={styles.videoInfo}>
                <Text
                  style={[
                    styles.videoPlatform,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {getPlatformDisplayName(video.platform)}
                </Text>
                <Text
                  style={[
                    styles.videoId,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  ID: {video.videoId}
                </Text>
              </View>
              {index === currentIndex && (
                <View
                  style={[
                    styles.nowPlaying,
                    { backgroundColor: colors.gold },
                  ]}
                >
                  <Text style={styles.nowPlayingText}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* No Videos Message */}
        {parsedVideos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No valid video links found
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: colors.textSecondary },
              ]}
            >
              Add YouTube Shorts, TikTok, Instagram Reels, or Facebook Reels
            </Text>
          </View>
        )}
      </View>

      {/* In-app WebView player (Play Now) */}
      <WebViewPlayer
        visible={showWebPlayer}
        urls={parsedVideos.map(v => v.originalUrl)}
        startIndex={currentIndex}
        onClose={() => setShowWebPlayer(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerSpacer: {
    width: 36,
  },
  closeButton: {
    padding: 10,
  },
  closeText: {
    fontSize: 24,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
  },
  currentVideoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  platformEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
  },
  videoUrl: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  appStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  resultText: {
    fontSize: 12,
    marginTop: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  controlText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 140,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  playAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  videoList: {
    maxHeight: SCREEN_HEIGHT * 0.3,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  videoEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoPlatform: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  videoId: {
    fontSize: 12,
  },
  nowPlaying: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingText: {
    color: '#000',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});
