import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_QUOTES_KEY = '@czar_ai_saved_quotes';

/**
 * Get all saved Czarisma AI quotes.
 */
export const getSavedAIQuotes = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(AI_QUOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Save a new AI quote (deduplicated, prepended).
 */
export const saveAIQuote = async (quote: string): Promise<void> => {
  const trimmed = quote.trim();
  if (!trimmed) return;
  const existing = await getSavedAIQuotes();
  if (existing.includes(trimmed)) return; // already saved
  const updated = [trimmed, ...existing];
  await AsyncStorage.setItem(AI_QUOTES_KEY, JSON.stringify(updated));
};

/**
 * Delete a saved AI quote by its text content.
 */
export const deleteAIQuote = async (quote: string): Promise<void> => {
  const existing = await getSavedAIQuotes();
  const updated = existing.filter(q => q !== quote);
  await AsyncStorage.setItem(AI_QUOTES_KEY, JSON.stringify(updated));
};
