import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  currentColor: string;
  mode: 'sent' | 'received';
}

export function ColorPickerModal({ visible, onClose, onSelectColor, currentColor, mode }: ColorPickerModalProps) {
  const { colors } = useTheme();

  const colorPalette = [
    { name: 'Black', color: '#000000' },
    { name: 'Dark Gray', color: '#4A4A4A' },
    { name: 'Gray', color: '#808080' },
    { name: 'Light Gray', color: '#B0B0B0' },
    { name: 'White', color: '#FFFFFF' },
    { name: 'Red', color: '#FF3B30' },
    { name: 'Orange', color: '#FF9500' },
    { name: 'Yellow', color: '#FFCC00' },
    { name: 'Green', color: '#34C759' },
    { name: 'Teal', color: '#5AC8FA' },
    { name: 'Blue', color: '#007AFF' },
    { name: 'Indigo', color: '#5856D6' },
    { name: 'Purple', color: '#AF52DE' },
    { name: 'Pink', color: '#FF2D55' },
    { name: 'Brown', color: '#A2845E' },
    { name: 'Dark Red', color: '#8B0000' },
    { name: 'Dark Orange', color: '#FF8C00' },
    { name: 'Gold', color: '#FFD700' },
    { name: 'Dark Green', color: '#006400' },
    { name: 'Cyan', color: '#00CED1' },
    { name: 'Navy', color: '#000080' },
    { name: 'Violet', color: '#8B00FF' },
    { name: 'Magenta', color: '#FF00FF' },
    { name: 'Crimson', color: '#DC143C' },
  ];

  const handleSelectColor = (color: string) => {
    onSelectColor(color);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}>
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}>
            <IconSymbol size={24} name="xmark" color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {mode === 'sent' ? 'Sent Message Text Color' : 'Received Message Text Color'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.previewContainer}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            Preview
          </Text>
          <View style={[
            styles.previewBubble, 
            { 
              backgroundColor: mode === 'sent' ? colors.messageBubble : colors.messageBubbleReceived,
              alignSelf: mode === 'sent' ? 'flex-end' : 'flex-start',
            }
          ]}>
            <Text style={[styles.previewText, { color: currentColor }]}>
              This is how your message text will look
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.colorGrid}
          showsVerticalScrollIndicator={false}>
          
          {colorPalette.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorItem,
                { backgroundColor: colors.card, borderColor: colors.border }
              ]}
              onPress={() => handleSelectColor(item.color)}
              activeOpacity={0.7}>
              
              <View style={styles.colorInfo}>
                <View style={[styles.colorSwatch, { backgroundColor: item.color }]}>
                  {currentColor === item.color && (
                    <IconSymbol size={20} name="checkmark" color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.colorDetails}>
                  <Text style={[styles.colorName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.colorCode, { color: colors.textSecondary }]}>
                    {item.color}
                  </Text>
                </View>
              </View>
              
              {currentColor === item.color && (
                <IconSymbol size={20} name="checkmark.circle.fill" color={colors.gold} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.card }]}
            onPress={() => handleSelectColor('#000000')}
            activeOpacity={0.7}>
            <Text style={[styles.resetButtonText, { color: colors.text }]}>Reset to Default</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  previewContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewBubble: {
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  previewText: {
    fontSize: 15,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  colorGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  colorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorDetails: {
    gap: 2,
  },
  colorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  colorCode: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  resetButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
