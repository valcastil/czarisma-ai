import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { MediaPermissions } from '@/utils/media-permissions';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_DURATION_SEC = 15;
const MAX_CAPTION = 150;
const MAX_RESOLUTION_PIXELS = 1920 * 1080; // 1080p cap

const CHARISMA_TAGS = [
  { id: 'confidence', label: 'Confidence', emoji: '💪' },
  { id: 'empathy', label: 'Empathy', emoji: '🤗' },
  { id: 'leadership', label: 'Leadership', emoji: '👑' },
  { id: 'humor', label: 'Humor', emoji: '😂' },
  { id: 'creativity', label: 'Creativity', emoji: '🎨' },
  { id: 'authenticity', label: 'Authentic', emoji: '🧬' },
  { id: 'positive_energy', label: 'Energy', emoji: '✨' },
  { id: 'courage', label: 'Courage', emoji: '🦁' },
  { id: 'wisdom', label: 'Wisdom', emoji: '🧠' },
  { id: 'passion', label: 'Passion', emoji: '🔥' },
];

const MOOD_EMOJIS = ['😊', '🔥', '✨', '💪', '🌟', '😎', '🙌', '💫', '🤩', '❤️', '😂', '🫂'];

export default function CreateCzareelScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTag, setSelectedTag] = useState<typeof CHARISMA_TAGS[0] | null>(null);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const validateAndSetVideo = (asset: ImagePicker.ImagePickerAsset) => {
    const durationSec = asset.duration ? asset.duration / 1000 : null;
    if (durationSec && durationSec > MAX_DURATION_SEC) {
      Alert.alert('Video Too Long', `Please select a video shorter than ${MAX_DURATION_SEC} seconds.`);
      return;
    }
    const pixels = (asset.width ?? 0) * (asset.height ?? 0);
    if (pixels > MAX_RESOLUTION_PIXELS) {
      Alert.alert('Resolution Too High', 'Please use a video with maximum 1080p resolution (4K not supported).');
      return;
    }
    setVideoUri(asset.uri);
    setVideoDuration(durationSec);
  };

  const handleRecordVideo = async () => {
    const hasPermission = await MediaPermissions.requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'] as any,
        allowsEditing: true,
        videoMaxDuration: MAX_DURATION_SEC,
        cameraType: cameraFacing === 'front'
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
        quality: ImagePicker.UIImagePickerControllerQualityType.High,
      });
      if (!result.canceled && result.assets[0]) {
        validateAndSetVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record video.');
    }
  };

  const handleUploadFromGallery = async () => {
    const hasPermission = await MediaPermissions.requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'] as any,
        allowsEditing: true,
        videoMaxDuration: MAX_DURATION_SEC,
        quality: ImagePicker.UIImagePickerControllerQualityType.High,
      });
      if (!result.canceled && result.assets[0]) {
        validateAndSetVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video from gallery.');
    }
  };

  const toggleMood = (emoji: string) => {
    setSelectedMoods(prev => {
      if (prev.includes(emoji)) return prev.filter(e => e !== emoji);
      if (prev.length >= 3) {
        Alert.alert('Max 3 moods', 'You can select up to 3 mood emojis.');
        return prev;
      }
      return [...prev, emoji];
    });
  };

  const handlePost = async () => {
    if (!videoUri) {
      Alert.alert('No video', 'Please record or upload a video first.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Sign in required', 'Please sign in to post a Czareel.');
      return;
    }

    setUploading(true);
    try {
      const userId = session.user.id;
      const timestamp = Date.now();

      // Determine extension from URI
      const uriLower = videoUri.toLowerCase();
      const ext = uriLower.includes('.mov') ? 'mov' : 'mp4';
      const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      const fileName = `${userId}/reel_${timestamp}.${ext}`;

      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) throw new Error('Video file not found');

      // Upload video
      const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: 'base64' });
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('czareels-videos')
        .upload(fileName, byteArray, { contentType: mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('czareels-videos')
        .getPublicUrl(fileName);

      // thumbnail_url = same as video_url; VideoView renders the first frame as poster
      const thumbnailUrl = videoUrl;

      const { error: insertError } = await supabase.from('czareels').insert({
        user_id: userId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption.trim() || null,
        charisma_tag: selectedTag?.id ?? null,
        charisma_emoji: selectedTag?.emoji ?? null,
        mood_emojis: selectedMoods.length > 0 ? selectedMoods : null,
        duration_sec: videoDuration,
      });

      if (insertError) throw insertError;

      Alert.alert('Posted!', 'Your Czareel is live 🎉', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error posting Czareel:', error);
      Alert.alert('Error', error?.message || 'Failed to post Czareel. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <IconSymbol size={24} name="xmark" color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Czareel</Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[styles.postBtn, { backgroundColor: uploading ? colors.border : colors.gold }]}
          disabled={uploading || !videoUri}
          activeOpacity={0.8}
        >
          {uploading
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={styles.postBtnText}>Post</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Video Picker Area */}
        {!videoUri ? (
          <View style={[styles.videoPickerArea, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol size={48} name="video.fill" color={colors.textSecondary} />
            <Text style={[styles.videoPickerTitle, { color: colors.text }]}>Add a Czareel</Text>
            <Text style={[styles.videoPickerSubtitle, { color: colors.textSecondary }]}>
              Max 15 seconds · Up to 1080p
            </Text>

            {/* Camera facing toggle */}
            <View style={styles.cameraToggle}>
              <TouchableOpacity
                style={[styles.cameraToggleBtn, cameraFacing === 'front' && { backgroundColor: colors.gold + '22', borderColor: colors.gold }]}
                onPress={() => setCameraFacing('front')}
                activeOpacity={0.7}
              >
                <IconSymbol size={18} name="camera.on.rectangle" color={cameraFacing === 'front' ? colors.gold : colors.textSecondary} />
                <Text style={[styles.cameraToggleText, { color: cameraFacing === 'front' ? colors.gold : colors.textSecondary }]}>Front</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cameraToggleBtn, cameraFacing === 'back' && { backgroundColor: colors.gold + '22', borderColor: colors.gold }]}
                onPress={() => setCameraFacing('back')}
                activeOpacity={0.7}
              >
                <IconSymbol size={18} name="camera.on.rectangle.fill" color={cameraFacing === 'back' ? colors.gold : colors.textSecondary} />
                <Text style={[styles.cameraToggleText, { color: cameraFacing === 'back' ? colors.gold : colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickButtonsRow}>
              <TouchableOpacity
                style={[styles.pickButton, { backgroundColor: colors.gold }]}
                onPress={handleRecordVideo}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="video.fill" color="#000" />
                <Text style={styles.pickButtonText}>Record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={handleUploadFromGallery}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="photo.on.rectangle" color={colors.text} />
                <Text style={[styles.pickButtonText, { color: colors.text }]}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.videoPreviewContainer, { backgroundColor: colors.card }]}>
            <Image
              source={{ uri: videoUri! }}
              style={styles.videoPreview}
              resizeMode="cover"
            />
            <View style={styles.videoPreviewPlayOverlay} pointerEvents="none">
              <View style={styles.videoPreviewPlayCircle}>
                <IconSymbol size={28} name="play.fill" color="#fff" />
              </View>
            </View>
            {videoDuration && (
              <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <Text style={styles.durationText}>{Math.round(videoDuration)}s</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.changeVideoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setVideoUri(null)}
              activeOpacity={0.7}
            >
              <IconSymbol size={14} name="arrow.counterclockwise" color={colors.textSecondary} />
              <Text style={[styles.changeVideoBtnText, { color: colors.textSecondary }]}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Caption</Text>
          <View style={[styles.captionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.captionInput, { color: colors.text }]}
              placeholder="Share what this moment means to you..."
              placeholderTextColor={colors.textSecondary}
              value={caption}
              onChangeText={t => setCaption(t.slice(0, MAX_CAPTION))}
              multiline
              maxLength={MAX_CAPTION}
            />
            <Text style={[styles.captionCounter, { color: caption.length >= MAX_CAPTION ? '#FF3B30' : colors.textSecondary }]}>
              {caption.length}/{MAX_CAPTION}
            </Text>
          </View>
        </View>

        {/* Charisma Tag */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Charisma Tag</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
            {CHARISMA_TAGS.map(tag => {
              const active = selectedTag?.id === tag.id;
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    { backgroundColor: active ? colors.gold + '22' : colors.card, borderColor: active ? colors.gold : colors.border },
                  ]}
                  onPress={() => setSelectedTag(active ? null : tag)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                  <Text style={[styles.tagLabel, { color: active ? colors.gold : colors.textSecondary }]}>{tag.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Mood Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Mood <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(up to 3)</Text>
          </Text>
          <View style={styles.moodGrid}>
            {MOOD_EMOJIS.map(emoji => {
              const active = selectedMoods.includes(emoji);
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.moodBtn, { backgroundColor: active ? colors.gold + '22' : colors.card, borderColor: active ? colors.gold : colors.border }]}
                  onPress={() => toggleMood(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  postBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },

  videoPickerArea: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  videoPickerTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  videoPickerSubtitle: { fontSize: 13, textAlign: 'center' },
  cameraToggle: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cameraToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cameraToggleText: { fontSize: 14, fontWeight: '600' },
  pickButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  pickButtonText: { color: '#000', fontWeight: '700', fontSize: 15 },

  videoPreviewContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 280,
    position: 'relative',
  },
  videoPreview: { width: '100%', height: '100%' },
  videoPreviewPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoPreviewPlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoPlayIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 48,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  durationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  changeVideoBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  changeVideoBtnText: { fontSize: 12, fontWeight: '600' },

  section: { gap: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700' },
  captionBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  captionInput: { fontSize: 15, lineHeight: 22, minHeight: 80 },
  captionCounter: { fontSize: 12, textAlign: 'right', marginTop: 6 },

  tagScroll: { flexGrow: 0 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  tagEmoji: { fontSize: 18 },
  tagLabel: { fontSize: 13, fontWeight: '600' },

  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: { fontSize: 24 },
});
