# 🌊 Liquid Glass Button - Usage Guide

## ✅ Component Created

The `GlassButton` component has been successfully created at:
**`components/ui/glass-button.tsx`**

---

## 🎨 Features

- **Glassmorphism Effect**: Semi-transparent backgrounds with gradient overlays
- **4 Variants**: Primary (gold), Secondary (neutral), Success (green), Danger (red)
- **3 Sizes**: Small, Medium, Large
- **Icon Support**: Add icons to buttons
- **Full Width Option**: Stretch button to container width
- **Disabled State**: Automatic opacity reduction
- **Platform Optimized**: Works on iOS and Android
- **Shadow & Shine**: Depth effects with subtle highlights

---

## 📖 Basic Usage

### Import the Component
```typescript
import { GlassButton } from '@/components/ui/glass-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
```

### Simple Button
```typescript
<GlassButton
  title="Continue"
  onPress={() => console.log('Pressed')}
/>
```

---

## 🎯 Variants

### Primary (Gold - Default)
```typescript
<GlassButton
  title="Save Entry"
  onPress={handleSave}
  variant="primary"
/>
```

### Secondary (Neutral)
```typescript
<GlassButton
  title="Cancel"
  onPress={handleCancel}
  variant="secondary"
/>
```

### Success (Green)
```typescript
<GlassButton
  title="Confirm"
  onPress={handleConfirm}
  variant="success"
/>
```

### Danger (Red)
```typescript
<GlassButton
  title="Delete"
  onPress={handleDelete}
  variant="danger"
/>
```

---

## 📏 Sizes

### Small
```typescript
<GlassButton
  title="Small Button"
  onPress={handlePress}
  size="small"
/>
```

### Medium (Default)
```typescript
<GlassButton
  title="Medium Button"
  onPress={handlePress}
  size="medium"
/>
```

### Large
```typescript
<GlassButton
  title="Large Button"
  onPress={handlePress}
  size="large"
/>
```

---

## 🎨 With Icons

```typescript
<GlassButton
  title="Save"
  onPress={handleSave}
  icon={<IconSymbol size={20} name="checkmark.circle" color="#F4C542" />}
/>

<GlassButton
  title="Delete"
  onPress={handleDelete}
  variant="danger"
  icon={<IconSymbol size={20} name="trash" color="#FF4444" />}
/>
```

---

## 🔧 Advanced Options

### Full Width
```typescript
<GlassButton
  title="Sign In"
  onPress={handleSignIn}
  fullWidth
/>
```

### Disabled State
```typescript
<GlassButton
  title="Submit"
  onPress={handleSubmit}
  disabled={!isValid}
/>
```

### Custom Styling
```typescript
<GlassButton
  title="Custom"
  onPress={handlePress}
  style={{ marginTop: 20, marginHorizontal: 10 }}
  textStyle={{ fontWeight: '700', letterSpacing: 1 }}
/>
```

---

## 🚀 Integration Examples

### Replace Existing Buttons in Settings Screen

**Before:**
```typescript
<TouchableOpacity
  style={[styles.signOutButton, { backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}
  onPress={handleSignOutPress}
  disabled={isSigningOut}>
  <View style={styles.settingInfo}>
    <Text style={[styles.settingLabel, { color: '#FF4444' }]}>
      Sign Out
    </Text>
  </View>
  <IconSymbol size={20} name="arrow.right.square" color="#FF4444" />
</TouchableOpacity>
```

**After:**
```typescript
<GlassButton
  title="Sign Out"
  onPress={handleSignOutPress}
  variant="danger"
  disabled={isSigningOut}
  fullWidth
  icon={<IconSymbol size={20} name="arrow.right.square" color="#FF4444" />}
/>
```

### Profile Screen Actions

```typescript
// In app/(tabs)/profile.tsx
<View style={{ paddingHorizontal: 20, gap: 12 }}>
  <GlassButton
    title="Edit Profile"
    onPress={handleEditProfile}
    variant="primary"
    icon={<IconSymbol size={20} name="pencil" color="#F4C542" />}
    fullWidth
  />
  
  <GlassButton
    title="Settings"
    onPress={handleSettings}
    variant="secondary"
    icon={<IconSymbol size={20} name="gearshape" color={colors.text} />}
    fullWidth
  />
</View>
```

### Onboarding Screens

```typescript
// In onboarding screens
<View style={{ padding: 20 }}>
  <GlassButton
    title="Get Started"
    onPress={handleGetStarted}
    variant="primary"
    size="large"
    fullWidth
  />
  
  <GlassButton
    title="Skip for Now"
    onPress={handleSkip}
    variant="secondary"
    size="medium"
    fullWidth
    style={{ marginTop: 12 }}
  />
</View>
```

### Change Password Screen

```typescript
// In app/change-password.tsx
<GlassButton
  title="Change Password"
  onPress={handleChangePassword}
  variant="primary"
  size="large"
  fullWidth
  disabled={loading}
  icon={loading ? <ActivityIndicator size="small" color="#F4C542" /> : undefined}
/>
```

### Chat Screen

```typescript
// In app/chat/[id].tsx
<GlassButton
  title="Send Message"
  onPress={handleSendMessage}
  variant="primary"
  size="small"
  disabled={!messageText.trim()}
  icon={<IconSymbol size={16} name="paperplane" color="#F4C542" />}
/>
```

---

## 🎨 Color Variants Reference

| Variant | Gradient Colors | Border | Text | Use Case |
|---------|----------------|--------|------|----------|
| **Primary** | Gold gradient | Gold glow | Gold | Main actions, CTAs |
| **Secondary** | White/transparent | White glow | Theme text | Secondary actions |
| **Success** | Green gradient | Green glow | Green | Confirmations, success |
| **Danger** | Red gradient | Red glow | Red | Deletions, warnings |

---

## 📐 Size Reference

| Size | Padding | Font Size | Border Radius | Use Case |
|------|---------|-----------|---------------|----------|
| **Small** | 10px / 16px | 14px | 10px | Compact spaces, inline actions |
| **Medium** | 14px / 24px | 16px | 12px | Standard buttons (default) |
| **Large** | 18px / 32px | 18px | 14px | Primary CTAs, important actions |

---

## 🔥 Quick Replace Guide

### Find and Replace Pattern

1. **Simple TouchableOpacity**
   - Find: `<TouchableOpacity onPress={...}>`
   - Replace with: `<GlassButton title="..." onPress={...} />`

2. **Styled Buttons**
   - Find: `<TouchableOpacity style={[styles.button, ...]}>...`
   - Replace with: `<GlassButton title="..." onPress={...} variant="..." />`

3. **Buttons with Icons**
   - Keep the icon, pass it to the `icon` prop

---

## 💡 Pro Tips

1. **Use Primary for Main Actions**: Gold variant draws attention
2. **Group Related Buttons**: Use same size for consistency
3. **Full Width for Forms**: Better on mobile screens
4. **Icons Enhance UX**: Add visual cues to actions
5. **Disabled State**: Automatically handles loading states

---

## 🎯 Where to Apply

### High Priority Screens:
1. ✅ **Settings Screen** - Sign out, save buttons
2. ✅ **Profile Screen** - Edit profile, settings
3. ✅ **Onboarding** - Get started, continue buttons
4. ✅ **Change Password** - Submit button
5. ✅ **Subscription** - Upgrade, purchase buttons

### Medium Priority:
6. **Chat Screen** - Send, attach buttons
7. **Entry Creation** - Save, cancel buttons
8. **Forms** - Submit, reset buttons

### Low Priority:
9. **List Items** - Action buttons
10. **Modals** - Confirm, cancel buttons

---

## 🚀 Installation Complete!

The liquid glass button component is ready to use. Start replacing your existing buttons with `GlassButton` for a modern, premium look!

**Component Location**: `components/ui/glass-button.tsx`

**Example Usage**:
```typescript
import { GlassButton } from '@/components/ui/glass-button';

<GlassButton
  title="Try Me!"
  onPress={() => Alert.alert('Glass Button Pressed!')}
  variant="primary"
  size="large"
  fullWidth
/>
```

Enjoy your new liquid glass buttons! 🌊✨
