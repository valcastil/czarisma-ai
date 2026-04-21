import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { IconSymbol } from '../components/ui/icon-symbol';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import {
  AvailabilityStatus,
  ClaimStatus,
  HandlePrefix,
  HandleState,
  checkHandleAvailability,
  claimHandle,
  cooldownDaysRemaining,
  fetchCurrentHandleState,
  isReservedLocally,
  statusMessage,
  validateHandleBody,
} from '../utils/handle-utils';

type TabKey = 'at' | 'hash';

interface CheckResult {
  status: AvailabilityStatus | 'checking' | 'idle';
  message: string;
}

export default function ClaimHandleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] || Colors.light;
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === 'edit';

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<HandleState | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('at');
  const [atBody, setAtBody] = useState('');
  const [hashBody, setHashBody] = useState('');
  const [atResult, setAtResult] = useState<CheckResult>({ status: 'idle', message: '' });
  const [hashResult, setHashResult] = useState<CheckResult>({ status: 'idle', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const atTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state
  useEffect(() => {
    (async () => {
      const s = await fetchCurrentHandleState();
      setState(s);
      if (s) {
        // Default active tab to the one the user needs to claim first.
        if (s.hasEmail && !s.handleAt) setActiveTab('at');
        else if (s.hasPhone && !s.handleHash) setActiveTab('hash');
        else if (s.hasEmail) setActiveTab('at');
        else if (s.hasPhone) setActiveTab('hash');
      }
      setLoading(false);
    })();
  }, []);

  // Debounced availability check for a given prefix
  const runCheck = useCallback(
    async (prefix: HandlePrefix, body: string, setter: (r: CheckResult) => void) => {
      const shape = validateHandleBody(body);
      if (shape) {
        setter({ status: 'invalid_shape', message: shape.message });
        return;
      }
      // Fast local reserved check for instant feedback
      if (await isReservedLocally(body)) {
        setter({ status: 'reserved', message: statusMessage('reserved') });
        return;
      }
      setter({ status: 'checking', message: 'Checking…' });
      const status = await checkHandleAvailability(prefix, body);
      setter({ status, message: statusMessage(status) });
    },
    [],
  );

  const onChangeAt = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setAtBody(cleaned);
    if (atTimer.current) clearTimeout(atTimer.current);
    if (!cleaned) {
      setAtResult({ status: 'idle', message: '' });
      return;
    }
    atTimer.current = setTimeout(() => runCheck('@', cleaned, setAtResult), 300);
  };

  const onChangeHash = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setHashBody(cleaned);
    if (hashTimer.current) clearTimeout(hashTimer.current);
    if (!cleaned) {
      setHashResult({ status: 'idle', message: '' });
      return;
    }
    hashTimer.current = setTimeout(() => runCheck('#', cleaned, setHashResult), 300);
  };

  const submit = async (prefix: HandlePrefix, body: string) => {
    if (!body) return;
    setSubmitting(true);
    const status: ClaimStatus = await claimHandle(prefix, body);
    setSubmitting(false);

    if (status === 'ok') {
      const fresh = await fetchCurrentHandleState();
      setState(fresh);
      if (prefix === '@') {
        setAtBody(body);
        setAtResult({ status: 'ok', message: 'Claimed' });
      } else {
        setHashBody(body);
        setHashResult({ status: 'ok', message: 'Claimed' });
      }

      // Decide next step
      const stillNeeds = fresh
        ? (fresh.hasEmail && !fresh.handleAt) || (fresh.hasPhone && !fresh.handleHash)
        : false;

      if (!stillNeeds && !isEditMode) {
        router.replace('/(tabs)');
      } else if (isEditMode) {
        Alert.alert('Saved', `${prefix}${body} is now your handle.`);
      }
    } else {
      Alert.alert('Could not claim handle', statusMessage(status));
    }
  };

  if (loading || !state) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const showAtTab = state.hasEmail;
  const showHashTab = state.hasPhone;

  const atCooldown = cooldownDaysRemaining(state.handleAtChangedAt);
  const hashCooldown = cooldownDaysRemaining(state.handleHashChangedAt);

  const renderTabContent = () => {
    if (activeTab === 'at') {
      if (!showAtTab) {
        return (
          <LockedNotice
            colors={colors}
            text="Link an email to your account to claim an @handle."
          />
        );
      }
      const current = state.handleAt;
      const disabled = atCooldown > 0 && isEditMode;
      return (
        <HandleEditor
          colors={colors}
          prefix="@"
          currentValue={current}
          body={atBody}
          onChangeBody={onChangeAt}
          result={atResult}
          disabled={disabled}
          cooldownDays={atCooldown}
          onSubmit={() => submit('@', atBody)}
          submitting={submitting}
          isEdit={isEditMode && !!current}
        />
      );
    }

    if (!showHashTab) {
      return (
        <LockedNotice
          colors={colors}
          text="Link a phone number to your account to claim a #handle."
        />
      );
    }
    const current = state.handleHash;
    const disabled = hashCooldown > 0 && isEditMode;
    return (
      <HandleEditor
        colors={colors}
        prefix="#"
        currentValue={current}
        body={hashBody}
        onChangeBody={onChangeHash}
        result={hashResult}
        disabled={disabled}
        cooldownDays={hashCooldown}
        onSubmit={() => submit('#', hashBody)}
        submitting={submitting}
        isEdit={isEditMode && !!current}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isEditMode && (
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <IconSymbol size={22} name="chevron.left" color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Your Handles</Text>
          <View style={styles.headerBtn} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {!isEditMode && (
            <View style={styles.intro}>
              <Text style={[styles.title, { color: colors.text }]}>
                Pick your handle
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your handle is how people find and mention you. You can change it
                later with a 30-day cooldown.
              </Text>
            </View>
          )}

          {/* Tab switcher (only if both auth methods are linked) */}
          {showAtTab && showHashTab && (
            <View style={[styles.tabs, { borderColor: colors.border }]}>
              <TabButton
                label="@ Email handle"
                active={activeTab === 'at'}
                onPress={() => setActiveTab('at')}
                colors={colors}
              />
              <TabButton
                label="# Phone handle"
                active={activeTab === 'hash'}
                onPress={() => setActiveTab('hash')}
                colors={colors}
              />
            </View>
          )}

          {renderTabContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- Subcomponents ----------

function TabButton({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabBtn,
        {
          backgroundColor: active ? colors.gold : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.tabBtnText,
          { color: active ? '#000' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LockedNotice({ colors, text }: { colors: any; text: string }) {
  return (
    <View style={[styles.lockedBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <IconSymbol size={24} name="lock" color={colors.textSecondary} />
      <Text style={[styles.lockedText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function HandleEditor({
  colors,
  prefix,
  currentValue,
  body,
  onChangeBody,
  result,
  disabled,
  cooldownDays,
  onSubmit,
  submitting,
  isEdit,
}: {
  colors: any;
  prefix: HandlePrefix;
  currentValue: string | null;
  body: string;
  onChangeBody: (v: string) => void;
  result: CheckResult;
  disabled: boolean;
  cooldownDays: number;
  onSubmit: () => void;
  submitting: boolean;
  isEdit: boolean;
}) {
  const canSubmit =
    !disabled &&
    !submitting &&
    body.length >= 3 &&
    result.status === 'ok';

  const resultColor = useMemo(() => {
    switch (result.status) {
      case 'ok': return '#2ecc71';
      case 'checking': return colors.textSecondary;
      case 'idle': return 'transparent';
      default: return '#e74c3c';
    }
  }, [result.status, colors.textSecondary]);

  return (
    <View style={{ gap: 12 }}>
      {currentValue && (
        <View style={[styles.currentBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>Current</Text>
          <Text style={[styles.currentValue, { color: colors.text }]}>
            {prefix}{currentValue}
          </Text>
        </View>
      )}

      {disabled && cooldownDays > 0 && (
        <View style={[styles.cooldownBox, { borderColor: colors.border }]}>
          <IconSymbol size={16} name="clock" color={colors.textSecondary} />
          <Text style={[styles.cooldownText, { color: colors.textSecondary }]}>
            You can change this handle again in {cooldownDays} day{cooldownDays === 1 ? '' : 's'}.
          </Text>
        </View>
      )}

      <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.inputPrefix, { color: colors.gold }]}>{prefix}</Text>
        <TextInput
          value={body}
          onChangeText={onChangeBody}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled && !submitting}
          placeholder="yourname"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text }]}
          maxLength={30}
        />
        {result.status === 'checking' && <ActivityIndicator size="small" color={colors.gold} />}
        {result.status === 'ok' && (
          <IconSymbol size={18} name="checkmark.circle.fill" color="#2ecc71" />
        )}
      </View>

      {result.message !== '' && (
        <Text style={[styles.resultMsg, { color: resultColor }]}>
          {result.message}
        </Text>
      )}

      <Text style={[styles.rulesText, { color: colors.textSecondary }]}>
        3–30 characters · start with a letter · lowercase letters, numbers, or underscore
      </Text>

      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: canSubmit ? colors.gold : colors.border },
        ]}
        onPress={onSubmit}
        disabled={!canSubmit}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={[styles.submitText, { color: canSubmit ? '#000' : colors.textSecondary }]}>
            {isEdit ? 'Save handle' : 'Claim handle'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 20, paddingTop: 60, gap: 24 },
  intro: { gap: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 21 },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnText: { fontSize: 14, fontWeight: '600' },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  lockedText: { flex: 1, fontSize: 14, lineHeight: 20 },
  currentBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  currentLabel: { fontSize: 12, fontWeight: '500' },
  currentValue: { fontSize: 20, fontWeight: '600' },
  cooldownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cooldownText: { fontSize: 13, flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputPrefix: { fontSize: 22, fontWeight: '700' },
  input: { flex: 1, fontSize: 18, padding: 0 },
  resultMsg: { fontSize: 13, fontWeight: '500' },
  rulesText: { fontSize: 12, lineHeight: 18 },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { fontSize: 16, fontWeight: '600' },
});
