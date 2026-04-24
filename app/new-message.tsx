import { IconSymbol } from '@/components/ui/icon-symbol';
import { User } from '@/constants/message-types';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentUser, getProfilesByPhones, getRegisteredUsers } from '@/utils/message-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ImportedContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
}

export default function NewMessageScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ImportedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSearchingAllContacts, setIsSearchingAllContacts] = useState(false);
  const [phoneMatchMap, setPhoneMatchMap] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    loadUsers();
    loadImportedContacts();
  }, []);

  // Cross-reference imported contacts with Czar AI users by phone number.
  useEffect(() => {
    if (contacts.length === 0) return;
    const allPhones = contacts.flatMap(c => c.phoneNumbers);
    if (allPhones.length === 0) return;
    getProfilesByPhones(allPhones).then(matchMap => {
      setPhoneMatchMap(matchMap);
      // Merge matched app-users into the users list so they appear in Users section.
      if (matchMap.size === 0) return;
      setUsers(prev => {
        const existingIds = new Set(prev.map(u => u.id));
        const toAdd: User[] = [];
        matchMap.forEach(user => {
          if (!existingIds.has(user.id)) toAdd.push(user);
        });
        if (toAdd.length === 0) return prev;
        const merged = [...prev, ...toAdd];
        return Array.from(new Map(merged.map(u => [u.id, u])).values());
      });
      setFilteredUsers(prev => {
        const existingIds = new Set(prev.map(u => u.id));
        const toAdd: User[] = [];
        matchMap.forEach(user => {
          if (!existingIds.has(user.id)) toAdd.push(user);
        });
        if (toAdd.length === 0) return prev;
        const merged = [...prev, ...toAdd];
        return Array.from(new Map(merged.map(u => [u.id, u])).values());
      });
    }).catch(() => {});
  }, [contacts]);

  // Debounced server-side user search. Scalable to 1M users — never fetches
  // the whole user base; each keystroke issues a capped ILIKE query.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    // Empty query → show the initial page (already in `users`) plus self.
    if (!trimmed) {
      setFilteredUsers(users);
      return;
    }
    // Too short → local substring match on the currently loaded page only.
    if (trimmed.length < 2) {
      const q = trimmed.toLowerCase();
      setFilteredUsers(
        users.filter(u =>
          u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
        )
      );
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const results = await getRegisteredUsers({ search: trimmed, limit: 50 });
        // Always include self if the query matches.
        const selfUser: User | null = currentUser
          ? { ...currentUser, isOnline: true, lastSeen: Date.now() }
          : null;
        const selfMatches = selfUser &&
          (selfUser.name.toLowerCase().includes(trimmed.toLowerCase()) ||
           selfUser.username.toLowerCase().includes(trimmed.toLowerCase()));
        const combined = [
          ...(selfMatches ? [selfUser!] : []),
          ...results,
        ];
        const unique = Array.from(new Map(combined.map(u => [u.id, u])).values());
        setFilteredUsers(unique);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, users, currentUser]);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  // Re-sort contacts list whenever the phone match map resolves.
  useEffect(() => {
    if (phoneMatchMap.size === 0) return;
    setFilteredContacts(prev => sortContacts(prev));
  }, [phoneMatchMap]);

  const loadUsers = async () => {
    try {
      // Initial page: first 50 registered users (server-ordered by name) + self.
      // Beyond this, use the search box — we never fetch the whole user base.
      const [registeredUsers, currentUserData] = await Promise.all([
        getRegisteredUsers({ limit: 50 }),
        getCurrentUser(),
      ]);

      setCurrentUser(currentUserData);

      const selfUser: User | null = currentUserData
        ? {
          ...currentUserData,
          isOnline: true,
          lastSeen: Date.now(),
        }
        : null;

      const allUsers = [
        ...(selfUser ? [selfUser] : []),
        ...registeredUsers,
      ];

      const uniqueUsers = Array.from(
        new Map(allUsers.map(u => [u.id, u])).values()
      );

      setUsers(uniqueUsers);
      setFilteredUsers(uniqueUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const sortContacts = (list: ImportedContact[]): ImportedContact[] =>
    [...list].sort((a, b) => {
      const aOnApp = a.phoneNumbers.some(p => phoneMatchMap.has(p));
      const bOnApp = b.phoneNumbers.some(p => phoneMatchMap.has(p));
      if (aOnApp === bOnApp) return 0;
      return aOnApp ? -1 : 1;
    });

  const loadImportedContacts = async () => {
    try {
      const contactsData = await AsyncStorage.getItem('@imported_contacts');
      if (contactsData) {
        const parsedContacts: ImportedContact[] = JSON.parse(contactsData);
        setContacts(parsedContacts);
        setFilteredContacts(sortContacts(parsedContacts));
      }
    } catch (error) {
      console.error('Error loading imported contacts:', error);
    }
  };

  const filterContacts = async () => {
    if (!searchQuery.trim()) {
      setFilteredContacts(sortContacts(contacts));
      setIsSearchingAllContacts(false);
      return;
    }

    const query = searchQuery.toLowerCase();

    // First, search in imported contacts
    const filteredImported = contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumbers.some(phone => phone.includes(query)) ||
      contact.emails.some(email => email.toLowerCase().includes(query))
    );

    // If search query is specific (3+ characters), search all phone contacts
    if (query.length >= 3) {
      setIsSearchingAllContacts(true);
      try {
        const { status } = await Contacts.getPermissionsAsync();

        if (status === 'granted') {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
          });

          // Search through all contacts
          const allMatchingContacts = data
            .filter((contact: any) => {
              const name = contact.name || '';
              const phones = contact.phoneNumbers?.map((p: any) => p.number) || [];
              const emails = contact.emails?.map((e: any) => e.email) || [];

              return (
                name.toLowerCase().includes(query) ||
                phones.some((phone: string) => phone.includes(query)) ||
                emails.some((email: string) => email.toLowerCase().includes(query))
              );
            })
            .map((contact: any) => ({
              id: contact.id,
              name: contact.name || 'Unknown',
              phoneNumbers: contact.phoneNumbers?.map((p: any) => p.number) || [],
              emails: contact.emails?.map((e: any) => e.email) || [],
            }))
            .slice(0, 50); // Limit search results to 50

          setFilteredContacts(sortContacts(allMatchingContacts));
        } else {
          setFilteredContacts(sortContacts(filteredImported));
        }
      } catch (error) {
        console.error('Error searching all contacts:', error);
        setFilteredContacts(sortContacts(filteredImported));
      }
      setIsSearchingAllContacts(false);
    } else {
      setFilteredContacts(sortContacts(filteredImported));
    }
  };

  const handleUserPress = (user: User) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  };

  const handleContactPress = async (contact: ImportedContact) => {
    const contactId = `contact_${contact.id}`;
    const openChat = () => {
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: contactId,
          username: contact.phoneNumbers[0] || contact.emails[0] || 'contact',
          name: contact.name,
        },
      });
    };

    const phoneNumber = contact.phoneNumbers[0];
    if (!phoneNumber) {
      openChat();
      return;
    }

    const smsAvailable = await SMS.isAvailableAsync();
    if (!smsAvailable) {
      openChat();
      return;
    }

    Alert.alert(
      contact.name,
      `${contact.name} isn't on Czar AI yet. Would you like to invite them?`,
      [
        {
          text: 'Invite via SMS',
          onPress: async () => {
            const message =
              `Hey ${contact.name}! I'm using Czar AI — a charisma-building chat app. Join me here:\n` +
              `• iOS: https://apps.apple.com/app/czar-ai/id6761360239\n` +
              `• Android: https://play.google.com/store/apps/details?id=com.aiagentmaker.charismachat`;
            await SMS.sendSMSAsync([phoneNumber], message);
          },
        },
        {
          text: 'Open Chat',
          onPress: openChat,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return '';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Active now';
    if (minutes < 60) return `Last seen ${minutes}m ago`;
    if (hours < 24) return `Last seen ${hours}h ago`;
    if (days < 7) return `Last seen ${days}d ago`;

    return `Last seen ${new Date(timestamp).toLocaleDateString()}`;
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.background === '#fff' ? '#FFFFFF' : colors.card, borderColor: colors.border }]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}>

      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: '#34C759', borderColor: colors.background }]} />
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {currentUser && item.id === currentUser.id ? `${item.name} (You)` : item.name}
        </Text>
        <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
          {item.handleAt ? `@${item.handleAt}` : item.handleHash ? `#${item.handleHash}` : `@${item.username}`}
        </Text>
        <Text style={[styles.userStatus, { color: colors.textSecondary }]}>
          {item.isOnline ? 'Active now' : formatLastSeen(item.lastSeen)}
        </Text>
      </View>

      <View style={styles.arrowIndicator}>
        <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }: { item: ImportedContact }) => {
    const matchedUser = item.phoneNumbers
      .map(p => phoneMatchMap.get(p))
      .find(Boolean);
    const isOnApp = !!matchedUser;

    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: colors.background === '#fff' ? '#FFFFFF' : colors.card, borderColor: colors.border }]}
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}>

        <View style={styles.avatarContainer}>
          {isOnApp && matchedUser!.avatarUrl ? (
            <Image source={{ uri: matchedUser!.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: isOnApp ? colors.gold : '#6C757D', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isOnApp ? (
            <View style={[styles.contactBadge, { backgroundColor: '#34C759' }]}>
              <IconSymbol size={10} name="checkmark" color="#FFFFFF" />
            </View>
          ) : (
            <View style={[styles.contactBadge, { backgroundColor: colors.gold }]}>
              <IconSymbol size={10} name="person.crop.circle" color="#000000" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
            {item.phoneNumbers[0] || item.emails[0] || 'No contact info'}
          </Text>
          <Text style={[styles.userStatus, { color: isOnApp ? '#34C759' : colors.textSecondary }]}>
            {isOnApp ? 'On Czar AI' : 'From your contacts'}
          </Text>
        </View>

        <View style={styles.arrowIndicator}>
          <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <IconSymbol size={24} name="chevron.left" color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>New Message</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <IconSymbol size={20} name="magnifyingglass" color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, @handle, or #handle..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearchingAllContacts && (
            <ActivityIndicator
              size="small"
              color={colors.gold}
              style={{ position: 'absolute', right: 16 }}
            />
          )}
        </View>
        {searchQuery.length >= 3 && (
          <Text style={[styles.searchHint, { color: colors.textSecondary }]}>
            Searching all contacts on your phone...
          </Text>
        )}
      </View>

      {/* Users and Contacts List */}
      <FlatList
        data={[]}
        renderItem={() => null}
        keyExtractor={(item, index) => `empty-${index}`}
        contentContainerStyle={styles.usersList}
        ListHeaderComponent={
          <>
            {/* Pro Users Section */}
            {filteredUsers.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <IconSymbol size={16} name="star.fill" color={colors.gold} />
                  <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                    Users
                  </Text>
                </View>
                {filteredUsers.map(user => (
                  <View key={user.id}>
                    {renderUserItem({ item: user })}
                  </View>
                ))}
              </>
            )}

            {/* Imported Contacts Section */}
            {filteredContacts.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: filteredUsers.length > 0 ? 20 : 0 }]}>
                  <IconSymbol size={16} name="person.crop.circle.badge.plus" color={colors.textSecondary} />
                  <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                    Your Contacts
                  </Text>
                </View>
                {filteredContacts.map(contact => (
                  <View key={contact.id}>
                    {renderContactItem({ item: contact })}
                  </View>
                ))}
              </>
            )}

            {/* Empty State */}
            {filteredUsers.length === 0 && filteredContacts.length === 0 && (
              <View style={styles.emptyState}>
                <IconSymbol size={64} name="person.3" color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery.trim() ? 'No results found' : 'No users or contacts available'}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  {searchQuery.trim() ?
                    'Try adjusting your search terms' :
                    'Import contacts or try again later'
                  }
                </Text>
              </View>
            )}
          </>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchHint: {
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 149, 0, 0.2)',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  usersList: {
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  contactBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 12,
  },
  arrowIndicator: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
