import { CharismaEntry } from '@/constants/theme';
import { SecureStorage } from '@/utils/secure-storage';

const ENTRIES_KEY = '@charisma_entries';

export const createDemoCharismaEntries = async (): Promise<void> => {
  try {
    const existingEntries = await SecureStorage.getItem(ENTRIES_KEY);
    if (existingEntries) {
      const entries: CharismaEntry[] = JSON.parse(existingEntries);
      if (entries.length > 0) {
        console.log('Demo entries already exist');
        return;
      }
    }

    const now = new Date();
    const demoEntries: CharismaEntry[] = [
      {
        id: (Date.now() - 86400000 * 2).toString(), // 2 days ago
        majorCharisma: 'confidence',
        charismaEmoji: '👑',
        subCharisma: 'Commanding Presence',
        emotionEmojis: ['💪', '⚡', '🦁'],
        notes: 'Gave a presentation at work and everyone was really impressed with my confidence and delivery. The team loved my ideas!',
        timestamp: Date.now() - 86400000 * 2,
        date: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
        time: '2:30 PM',
      },
      {
        id: (Date.now() - 86400000).toString(), // 1 day ago
        majorCharisma: 'empathy',
        charismaEmoji: '🤗',
        subCharisma: 'Deep Listening',
        emotionEmojis: ['🤗', '☀️', '💖'],
        notes: 'Had a great conversation with a friend who was going through a tough time. Really listened and supported them.',
        timestamp: Date.now() - 86400000,
        date: new Date(Date.now() - 86400000).toLocaleDateString(),
        time: '6:45 PM',
      },
      {
        id: Date.now().toString(), // Today
        majorCharisma: 'inspiring_vision',
        charismaEmoji: '🚀',
        subCharisma: 'Creative Problem Solving',
        emotionEmojis: ['🚀', '✨', '🎯'],
        notes: 'Came up with an innovative solution to a complex problem at work. My team is excited to implement the new approach!',
        timestamp: Date.now(),
        date: now.toLocaleDateString(),
        time: '10:15 AM',
      },
      {
        id: (Date.now() - 3600000).toString(), // 1 hour ago
        majorCharisma: 'humor',
        charismaEmoji: '😂',
        subCharisma: 'Witty Banter',
        emotionEmojis: ['😂', '🎭', '😜'],
        notes: 'Lightened the mood during a stressful meeting with some well-timed humor. Everyone appreciated the break in tension!',
        timestamp: Date.now() - 3600000,
        date: now.toLocaleDateString(),
        time: '11:30 AM',
      },
    ];

    await SecureStorage.setItem(ENTRIES_KEY, JSON.stringify(demoEntries));
    console.log('Demo charisma entries created successfully');
  } catch (error) {
    console.error('Error creating demo entries:', error);
  }
};

export const clearDemoEntries = async (): Promise<void> => {
  try {
    await SecureStorage.removeItem(ENTRIES_KEY);
    console.log('Demo entries cleared');
  } catch (error) {
    console.error('Error clearing demo entries:', error);
  }
};
