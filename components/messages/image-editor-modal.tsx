import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Canvas,
  Fill,
  Image as SkiaImage,
  Path,
  Skia,
  useCanvasRef,
  useImage,
} from '@shopify/react-native-skia';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveSkiaImageToFile } from '@/utils/image-snapshot-utils';

const { width: SW, height: SH } = Dimensions.get('window');
const CANVAS_W = SW;
const CANVAS_H = SH * 0.65;

type Tool = 'draw' | 'text' | 'crop';

interface DrawnPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface TextNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

const PALETTE = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#5AC8FA',
];

const PEN_SIZES = [3, 6, 12, 20];

interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onDone: (editedUri: string) => void;
}

export function ImageEditorModal({ visible, imageUri, onCancel, onDone }: ImageEditorModalProps) {
  const insets = useSafeAreaInsets();
  const canvasRef = useCanvasRef();
  const image = useImage(imageUri ?? '');

  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#FF3B30');
  const [penSize, setPenSize] = useState(6);
  const [paths, setPaths] = useState<DrawnPath[]>([]);
  const [textNodes, setTextNodes] = useState<TextNode[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentPath = useRef<string>('');
  const isDrawing = useRef(false);

  const addPath = useCallback((p: string, c: string, sw: number) => {
    setPaths(prev => [...prev, { path: p, color: c, strokeWidth: sw }]);
  }, []);

  const handleUndo = useCallback(() => {
    if (tool === 'text') {
      setTextNodes(prev => prev.slice(0, -1));
    } else {
      setPaths(prev => prev.slice(0, -1));
    }
  }, [tool]);

  const handleDone = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      setSaving(true);
      const snapshot = canvasRef.current.makeImageSnapshot();
      if (!snapshot) throw new Error('Snapshot failed');
      const uri = await saveSkiaImageToFile(snapshot);
      onDone(uri);
    } catch (e) {
      console.error('Image editor snapshot error', e);
    } finally {
      setSaving(false);
    }
  }, [canvasRef, onDone]);

  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return;
    setTextNodes(prev => [
      ...prev,
      {
        id: String(Date.now()),
        text: textInput.trim(),
        x: CANVAS_W / 2 - textInput.length * 7,
        y: CANVAS_H / 2,
        color,
        fontSize: 24,
      },
    ]);
    setTextInput('');
    setShowTextInput(false);
  }, [textInput, color]);

  const drawGesture = Gesture.Pan()
    .onBegin((e) => {
      if (tool !== 'draw') return;
      isDrawing.current = true;
      currentPath.current = `M ${e.x} ${e.y}`;
    })
    .onUpdate((e) => {
      if (tool !== 'draw' || !isDrawing.current) return;
      currentPath.current += ` L ${e.x} ${e.y}`;
    })
    .onEnd(() => {
      if (tool !== 'draw' || !isDrawing.current) return;
      isDrawing.current = false;
      runOnJS(addPath)(currentPath.current, color, penSize);
      currentPath.current = '';
    })
    .minDistance(0);

  const imageDrawWidth = image ? Math.min(CANVAS_W, (image.width() / image.height()) * CANVAS_H) : CANVAS_W;
  const imageDrawHeight = image ? imageDrawWidth * (image.height() / image.width()) : CANVAS_H;
  const imageX = (CANVAS_W - imageDrawWidth) / 2;
  const imageY = (CANVAS_H - imageDrawHeight) / 2;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        {/* Toolbar */}
        <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onCancel} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.toolTabs}>
            {(['draw', 'text'] as Tool[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTool(t); if (t === 'text') setShowTextInput(true); }}
                style={[styles.toolTab, tool === t && styles.toolTabActive]}
              >
                <Text style={[styles.toolTabText, tool === t && styles.toolTabTextActive]}>
                  {t === 'draw' ? '✏️ Draw' : 'T Text'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.toolbarRight}>
            <TouchableOpacity onPress={handleUndo} style={styles.toolbarBtn}>
              <Text style={styles.toolbarBtnText}>↩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDone} style={styles.doneBtn} disabled={saving}>
              <Text style={styles.doneBtnText}>{saving ? '…' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Canvas */}
        <GestureDetector gesture={drawGesture}>
          <View style={styles.canvasContainer}>
            <Canvas ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H }}>
              <Fill color="#000" />
              {image && (
                <SkiaImage
                  image={image}
                  x={imageX}
                  y={imageY}
                  width={imageDrawWidth}
                  height={imageDrawHeight}
                  fit="contain"
                />
              )}
              {paths.map((p, i) => {
                const skPath = Skia.Path.MakeFromSVGString(p.path);
                if (!skPath) return null;
                return (
                  <Path
                    key={i}
                    path={skPath}
                    color={p.color}
                    style="stroke"
                    strokeWidth={p.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                );
              })}
            </Canvas>
            {/* Text nodes rendered as native Text over canvas for tap/drag */}
            {textNodes.map((node) => (
              <Pressable
                key={node.id}
                style={[styles.textNode, { left: node.x, top: node.y }]}
              >
                <Text style={[styles.textNodeText, { color: node.color, fontSize: node.fontSize }]}>
                  {node.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </GestureDetector>

        {/* Bottom controls */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Color palette */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteRow} contentContainerStyle={styles.paletteContent}>
            {PALETTE.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSwatchSelected,
                ]}
              />
            ))}
          </ScrollView>

          {/* Draw: pen size selector */}
          {tool === 'draw' && (
            <View style={styles.penSizeRow}>
              {PEN_SIZES.map(s => (
                <TouchableOpacity key={s} onPress={() => setPenSize(s)} style={styles.penSizeBtn}>
                  <View style={[
                    styles.penDot,
                    { width: s + 4, height: s + 4, borderRadius: (s + 4) / 2, backgroundColor: color },
                    penSize === s && styles.penDotSelected,
                  ]} />
                </TouchableOpacity>
              ))}
              <Text style={styles.penSizeLabel}>Pen size</Text>
            </View>
          )}

          {/* Text: input row */}
          {tool === 'text' && (
            <View style={styles.textInputRow}>
              <TextInput
                style={[styles.textInputField, { color: '#fff', borderColor: color }]}
                placeholder="Type text..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={textInput}
                onChangeText={setTextInput}
                autoFocus={showTextInput}
                returnKeyType="done"
                onSubmitEditing={handleAddText}
              />
              <TouchableOpacity onPress={handleAddText} style={[styles.addTextBtn, { backgroundColor: color }]}>
                <Text style={styles.addTextBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  toolTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  toolTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  toolTabActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  toolTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  toolTabTextActive: {
    color: '#fff',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneBtn: {
    backgroundColor: '#C9A84C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  canvasContainer: {
    width: CANVAS_W,
    height: CANVAS_H,
    position: 'relative',
  },
  textNode: {
    position: 'absolute',
  },
  textNodeText: {
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  paletteRow: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
  },
  paletteContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  penSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
    backgroundColor: '#1a1a1a',
  },
  penSizeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  penDot: {
    opacity: 0.7,
  },
  penDotSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  penSizeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginLeft: 'auto',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#1a1a1a',
  },
  textInputField: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  addTextBtn: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
