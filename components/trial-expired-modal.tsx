import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface TrialExpiredModalProps {
  visible: boolean;
  daysRemaining?: number;
  onClose?: () => void;
}

export function TrialExpiredModal({ visible, daysRemaining, onClose }: TrialExpiredModalProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleSignUp = () => {
    if (onClose) onClose();
    router.push('/auth-sign-in');
  };

  // Show different message based on trial state
  const isExpiringSoon = daysRemaining !== undefined && daysRemaining > 0 && daysRemaining <= 2;
  const title = isExpiringSoon 
    ? `Trial Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}!`
    : 'Your Free Trial Has Expired';
  
  const message = isExpiringSoon
    ? 'Sign up now to continue using CzarApp and get 3 months FREE access to all features!'
    : 'Your 7-day free trial has ended. Sign up to continue using CzarApp and get 3 months FREE access to all Pro features!';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}} // Prevent closing by back button
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.gold }]}>
            <Text style={styles.icon}>⏰</Text>
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
          
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>

          <View style={styles.benefitsContainer}>
            <Text style={[styles.benefitsTitle, { color: colors.gold }]}>
              What you get after signing up:
            </Text>
            <View style={styles.benefitItem}>
              <Text style={[styles.benefitIcon, { color: colors.gold }]}>✓</Text>
              <Text style={[styles.benefitText, { color: colors.text }]}>3 months FREE access</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={[styles.benefitIcon, { color: colors.gold }]}>✓</Text>
              <Text style={[styles.benefitText, { color: colors.text }]}>All premium charisma types</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={[styles.benefitIcon, { color: colors.gold }]}>✓</Text>
              <Text style={[styles.benefitText, { color: colors.text }]}>Unlimited entries</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={[styles.benefitIcon, { color: colors.gold }]}>✓</Text>
              <Text style={[styles.benefitText, { color: colors.text }]}>AI-powered insights</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.signUpButton, { backgroundColor: colors.gold }]}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>
              Sign Up Free →
            </Text>
          </TouchableOpacity>

          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            No credit card required
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    width: '90%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 14,
  },
  signUpButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  signUpButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    marginTop: 12,
    fontSize: 12,
  },
});
