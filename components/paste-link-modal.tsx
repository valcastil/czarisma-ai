import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { addMultipleLinks, detectPlatform, getPlatformColor, getPlatformEmoji, parseLinksFromText } from '@/utils/link-storage';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface PasteLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onLinkAdded: () => void;
}

export function PasteLinkModal({ visible, onClose, onLinkAdded }: PasteLinkModalProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedLinks = useMemo(() => parseLinksFromText(text), [text]);
  const detectedPlatforms = useMemo(() => {
    return parsedLinks.map((url) => ({ url, ...detectPlatform(url) }));
  }, [parsedLinks]);

  const hasLinks = parsedLinks.length > 0;

  const handleSave = async () => {
    if (!hasLinks) {
      Alert.alert('No Links Found', 'Paste one or more links from YouTube, Instagram, TikTok, or Facebook Reels.');
      return;
    }

    try {
      setSaving(true);
      await addMultipleLinks(parsedLinks);
      setText('');
      onLinkAdded();
      onClose();
    } catch (error) {
      console.error('Error saving links:', error);
      Alert.alert('Error', 'Failed to save links');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Paste Social Links</Text>
            <TouchableOpacity onPress={handleClose}>
              <IconSymbol size={24} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Supported platforms */}
          <View style={styles.platformHints}>
            <Text style={[styles.hintLabel, { color: colors.textSecondary }]}>Supported platforms:</Text>
            <View style={styles.platformTags}>
              {(['youtube', 'instagram', 'tiktok', 'reels'] as const).map((p) => (
                <View
                  key={p}
                  style={[styles.platformHintTag, { backgroundColor: getPlatformColor(p) + '20' }]}>
                  <Text style={styles.platformHintEmoji}>{getPlatformEmoji(p)}</Text>
                  <Text style={[styles.platformHintText, { color: getPlatformColor(p) }]}>
                    {p === 'youtube' ? 'YouTube' : p === 'instagram' ? 'Instagram' : p === 'tiktok' ? 'TikTok' : 'Reels'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Multi-line URL Input */}
          <View style={[styles.inputContainer, { borderColor: hasLinks ? colors.gold : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={"Paste one or more links here...\nEach link on a new line"}
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Detected links preview */}
          {detectedPlatforms.length > 0 && (
            <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
              {detectedPlatforms.map((item, i) => (
                <View key={i} style={[styles.previewRow, { backgroundColor: getPlatformColor(item.platform) + '10' }]}>
                  <Text style={styles.previewEmoji}>{getPlatformEmoji(item.platform)}</Text>
                  <Text style={[styles.previewLabel, { color: getPlatformColor(item.platform) }]}>{item.label}</Text>
                  <Text style={[styles.previewUrl, { color: colors.textSecondary }]} numberOfLines={1}>{item.url}</Text>
                  <IconSymbol size={14} name="checkmark.circle.fill" color="#34C759" />
                </View>
              ))}
            </ScrollView>
          )}

          {text.trim().length > 0 && parsedLinks.length === 0 && (
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: '#FF3B30' }]}>No supported links detected</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: hasLinks ? colors.gold : colors.border },
            ]}
            onPress={handleSave}
            disabled={!hasLinks || saving}
            activeOpacity={0.8}>
            <IconSymbol size={20} name="plus.circle.fill" color={hasLinks ? '#000000' : colors.textSecondary} />
            <Text style={[styles.saveButtonText, { color: hasLinks ? '#000000' : colors.textSecondary }]}>
              {saving ? 'Saving...' : `Add ${parsedLinks.length > 0 ? parsedLinks.length : ''} Link${parsedLinks.length !== 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  platformHints: {
    marginBottom: 16,
  },
  hintLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformHintTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  platformHintEmoji: {
    fontSize: 14,
  },
  platformHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    minHeight: 100,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 0,
    minHeight: 80,
  },
  previewScroll: {
    maxHeight: 140,
    marginBottom: 12,
  },
  previewContent: {
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginBottom: 4,
  },
  previewEmoji: {
    fontSize: 14,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewUrl: {
    flex: 1,
    fontSize: 11,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
