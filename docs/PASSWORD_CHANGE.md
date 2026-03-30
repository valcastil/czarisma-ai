# Password Change Functionality

## Overview

The Charisma Tracker app now supports password changes for both authenticated users (Supabase Auth) and local/guest users (AsyncStorage).

## Features

### 1. Universal Password Change
- **Authenticated Users**: Password changes are synced with Supabase Auth
- **Local Users**: Password changes are stored locally in AsyncStorage
- **Automatic Detection**: The system automatically detects user type and applies the appropriate method

### 2. User Interface
- **Change Password Screen**: Located at `/change-password`
- **User Type Indicator**: Shows whether user is authenticated or local
- **Eye Button**: Toggle password visibility for all password fields
- **Real-time Validation**: Password requirements are validated before submission

### 3. Password Requirements

#### For Authenticated Users (Supabase)
- Minimum 12 characters
- Must contain:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)

#### For Local Users (Guest)
- Minimum 6 characters
- Must contain:
  - At least one letter
  - At least one number

## Usage

### Accessing the Change Password Screen

From the settings or profile screen, navigate to the change password option:

```typescript
import { router } from 'expo-router';

// Navigate to change password screen
router.push('/change-password');
```

### Programmatic Password Change

```typescript
import { changePasswordUniversal } from '@/utils/password-utils';

const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
  const result = await changePasswordUniversal(currentPassword, newPassword);
  
  if (result.success) {
    console.log('Password changed successfully');
  } else {
    console.error('Error:', result.message);
  }
};
```

## API Reference

### `changePasswordUniversal(currentPassword, newPassword)`

Universal function that works for both authenticated and local users.

**Parameters:**
- `currentPassword` (string): The user's current password
- `newPassword` (string): The new password to set

**Returns:**
```typescript
{
  success: boolean;
  message: string;
}
```

### `changePasswordSupabase(newPassword)`

Changes password for authenticated Supabase users only.

**Parameters:**
- `newPassword` (string): The new password to set

**Returns:**
```typescript
{
  success: boolean;
  message: string;
}
```

### `changePasswordLocal(currentPassword, newPassword)`

Changes password for local users only.

**Parameters:**
- `currentPassword` (string): The user's current password
- `newPassword` (string): The new password to set

**Returns:**
```typescript
{
  success: boolean;
  message: string;
}
```

### `isAuthenticatedUser()`

Checks if the current user is authenticated with Supabase.

**Returns:** `Promise<boolean>`

### `checkUserExists(email)`

Checks if a user exists in the Supabase database.

**Parameters:**
- `email` (string): Email address to check

**Returns:** `Promise<boolean>`

### `getAllUsers()`

Retrieves all users from the Supabase profiles table.

**Returns:** `Promise<Array<User>>`

## Checking Existing Users

To check existing users in the database, run:

```bash
npx ts-node scripts/check-users.ts
```

This script will:
- List all authenticated users (if service role key is available)
- List all user profiles from the database
- Provide a summary of total users

## Security Features

1. **Input Sanitization**: All passwords are sanitized before processing
2. **Validation**: Passwords are validated against security requirements
3. **Current Password Verification**: Users must provide their current password
4. **Secure Storage**: 
   - Authenticated users: Passwords stored securely in Supabase Auth
   - Local users: Passwords stored in encrypted AsyncStorage

## Error Handling

The password change functions return descriptive error messages:

- "Current password is incorrect"
- "Password must be at least X characters long"
- "Password must contain uppercase, lowercase, numbers, and special characters"
- "New passwords do not match"
- "No authenticated user found. Please sign in first."

## Integration with Existing Features

### Sign In Screen
- Eye button added for password visibility toggle
- Works in both light and dark modes
- High contrast colors for better visibility

### Profile/Settings Screen
Add a button to navigate to the change password screen:

```typescript
<TouchableOpacity onPress={() => router.push('/change-password')}>
  <Text>Change Password</Text>
</TouchableOpacity>
```

## Testing

### Test Scenarios

1. **Authenticated User Password Change**
   - Sign in with Supabase account
   - Navigate to change password
   - Verify user email is displayed
   - Change password with valid credentials
   - Verify password is updated in Supabase Auth

2. **Local User Password Change**
   - Use app as guest
   - Navigate to change password
   - Verify "Local User (Guest)" is displayed
   - Change password with valid credentials
   - Verify password is updated in AsyncStorage

3. **Validation Testing**
   - Try passwords that are too short
   - Try passwords without required characters
   - Try mismatched confirm password
   - Try incorrect current password

## Future Enhancements

- [ ] Password strength meter
- [ ] Password history (prevent reuse)
- [ ] Two-factor authentication
- [ ] Password reset via email
- [ ] Biometric authentication option
- [ ] Password expiration reminders

## Troubleshooting

### Issue: "No authenticated user found"
**Solution**: User needs to sign in with Supabase account first

### Issue: Password change fails silently
**Solution**: Check console logs for detailed error messages

### Issue: Eye button not visible in light mode
**Solution**: Updated to use high contrast colors (#000000 for light, #FFFFFF for dark)

## Related Files

- `/app/change-password.tsx` - Change password screen UI
- `/utils/password-utils.ts` - Password change utilities
- `/utils/security.ts` - Password validation and sanitization
- `/utils/profile-utils.ts` - Local user profile management
- `/scripts/check-users.ts` - User database checker script
