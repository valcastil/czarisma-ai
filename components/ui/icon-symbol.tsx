// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Tab bar icons
  'house': 'home',
  'house.fill': 'home',
  'message': 'message',
  'message.fill': 'message',
  'magnifyingglass': 'search',
  'person': 'person',
  'person.fill': 'person',
  'plus': 'add',
  
  // Navigation icons
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.left.forwardslash.chevron.right': 'code',
  
  // Action icons
  'paperplane': 'send',
  'paperplane.fill': 'send',
  'paperclip': 'attach-file',
  'mic': 'mic',
  'mic.fill': 'mic',
  'stop.circle': 'stop-circle',
  'stop.circle.fill': 'stop-circle',
  'pencil': 'edit',
  'pencil.circle': 'edit',
  'trash': 'delete',
  'checkmark': 'check',
  'checkmark.seal.fill': 'verified',
  
  // Menu icons
  'ellipsis': 'more-horiz',
  'ellipsis.circle': 'more-horiz',
  
  // Other common icons
  'person.3': 'group',
  'person.3.fill': 'group',
  
  // Password visibility icons
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  
  // Checkmark icons
  'checkmark.circle.fill': 'check-circle',
  
  // Attachment modal icons
  'photo': 'photo',
  'photo.fill': 'photo',
  'video': 'videocam',
  'video.fill': 'videocam',
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  'video.circle.fill': 'videocam',
  'doc': 'description',
  'doc.fill': 'description',
  'sparkles': 'auto-awesome',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'arrowshape.turn.up.forward': 'forward',
  
  // Settings & info icons
  'gearshape': 'settings',
  'gearshape.fill': 'settings',
  'info.circle': 'info',
  'info.circle.fill': 'info',
  'creditcard.fill': 'credit-card',
  'gift.fill': 'card-giftcard',
  'person.circle': 'account-circle',
  
  // Arrows
  'arrow.down': 'arrow-downward',
  'arrow.up': 'arrow-upward',
  'arrow.up.right': 'arrow-outward',

  // Shared links platform icons
  'play.rectangle.fill': 'play-arrow',
  'music.note': 'music-note',
  'text.bubble': 'chat-bubble',
  'bubble.left.and.bubble.right': 'forum',
  'briefcase.fill': 'work',
  'link': 'link',
  'star.fill': 'star',
  'arrow.down.circle': 'download',
  'square.and.arrow.up': 'share',
  'arrow.down.to.line': 'file-download',
  'play.circle.fill': 'play-circle-filled',
  'doc.text.fill': 'description',
  'tablecells.fill': 'table-chart',
  'chart.bar.doc.horizontal.fill': 'insert-chart',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
