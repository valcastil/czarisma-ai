import * as FileSystem from 'expo-file-system/legacy';
import { SkImage } from '@shopify/react-native-skia';

export async function saveSkiaImageToFile(image: SkImage): Promise<string> {
  const bytes = image.encodeToBytes();
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary);
  const path = `${FileSystem.cacheDirectory}edited_${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}
