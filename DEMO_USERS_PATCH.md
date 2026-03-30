# Demo Users Patch for new-message.tsx

To add temporary demo Pro & Trial users, replace lines 66-70 in `app/new-message.tsx` with the following:

```typescript
      // Filter users who have valid subscriptions (Pro or active trial) and are online
      const usersWithValidSubscriptions = await getUsersWithValidSubscriptions(otherUsers);
      
      // Add temporary demo users for testing
      const demoUsers: User[] = [
        {
          id: 'demo_pro_1',
          username: 'sarah_pro',
          name: 'Sarah Johnson (PRO)',
          isOnline: true,
          lastSeen: Date.now(),
        },
        {
          id: 'demo_pro_2',
          username: 'mike_premium',
          name: 'Mike Chen (PRO)',
          isOnline: false,
          lastSeen: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          id: 'demo_trial_1',
          username: 'emma_trial',
          name: 'Emma Davis (TRIAL)',
          isOnline: true,
          lastSeen: Date.now(),
        },
        {
          id: 'demo_trial_2',
          username: 'alex_trying',
          name: 'Alex Martinez (TRIAL)',
          isOnline: false,
          lastSeen: Date.now() - (30 * 60 * 1000), // 30 minutes ago
        },
      ];
      
      // Combine demo users with real users
      const allUsers = [...demoUsers, ...usersWithValidSubscriptions];
      
      setUsers(allUsers);
      setFilteredUsers(allUsers);
```

This will add 4 demo users (2 Pro, 2 Trial) that you can use to test sending messages!
