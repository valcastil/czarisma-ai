import { CzarCompanion } from '@/components/czar-companion';
import { evaluateCzareelAnswers, generateCzareelQuestions } from '@/lib/gemini';
import { useTheme } from '@/hooks/use-theme';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CzareelQuestionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    questions: string[];
    answers: string[];
    feedback: string;
  }) => void;
  videoContext?: string;
}

export function CzareelQuestionsModal({
  visible,
  onClose,
  onSubmit,
  videoContext,
}: CzareelQuestionsModalProps) {
  const { colors } = useTheme();
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [feedback, setFeedback] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setFeedbackLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [czarMessage, setCzarMessage] = useState('');

  const MAX_CHARS = 500;

  useEffect(() => {
    if (visible) {
      generateQuestions();
    }
  }, [visible]);

  const generateQuestions = async () => {
    setGenerating(true);
    setCzarMessage('Let me think of some questions for you...');
    try {
      const generatedQuestions = await generateCzareelQuestions(videoContext);
      setQuestions(generatedQuestions);
      setCzarMessage('I have some questions for you about your video!');
    } catch (error) {
      console.error('Error generating questions:', error);
      Alert.alert('Error', 'Failed to generate questions. Please try again.');
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value.slice(0, MAX_CHARS);
    setAnswers(newAnswers);
  };

  const handleGetFeedback = async () => {
    // Validate all answers are provided
    if (answers.some(a => a.trim().length === 0)) {
      Alert.alert('Incomplete Answers', 'Please answer all three questions before getting feedback.');
      return;
    }

    setFeedbackLoading(true);
    setCzarMessage('Let me review your answers...');
    try {
      const result = await evaluateCzareelAnswers(questions, answers);
      setFeedback(result.feedback);
      setSuggestions(result.suggestions);
      setCzarMessage('Here is my feedback on your answers!');
    } catch (error) {
      console.error('Error getting feedback:', error);
      Alert.alert('Error', 'Failed to get feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSubmit = () => {
    // Validate all answers are provided
    if (answers.some(a => a.trim().length === 0)) {
      Alert.alert('Incomplete Answers', 'Please answer all three questions before submitting.');
      return;
    }

    if (!feedback) {
      Alert.alert('Feedback Required', 'Please get feedback before submitting your answers.');
      return;
    }

    onSubmit({
      questions,
      answers,
      feedback: `${feedback}\n\nSuggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`,
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel?',
      'Are you sure you want to cancel? Your answers will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  if (generating) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            <CzarCompanion
              message={czarMessage}
              size="large"
              mood="thinking"
              intelligent
              onDismiss={onClose}
            />
            <ActivityIndicator size="large" color={colors.gold} style={styles.loader} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Generating questions...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Czar AI Questions</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <CzarCompanion
              message={czarMessage}
              size="medium"
              mood="happy"
              intelligent
              onDismiss={handleCancel}
            />

            {questions.map((question, index) => (
              <View key={index} style={styles.questionCard}>
                <Text style={[styles.questionText, { color: colors.text }]}>
                  {question}
                </Text>
                <TextInput
                  style={[styles.answerInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Type your answer..."
                  placeholderTextColor={colors.textSecondary}
                  value={answers[index]}
                  onChangeText={(value) => handleAnswerChange(index, value)}
                  multiline
                  numberOfLines={4}
                  maxLength={MAX_CHARS}
                />
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                  {answers[index].length}/{MAX_CHARS}
                </Text>
              </View>
            ))}

            {feedback && (
              <View style={[styles.feedbackCard, { backgroundColor: colors.background, borderColor: colors.gold }]}>
                <Text style={[styles.feedbackTitle, { color: colors.gold }]}>Czar AI Feedback</Text>
                <Text style={[styles.feedbackText, { color: colors.text }]}>{feedback}</Text>
                {suggestions.length > 0 && (
                  <View style={styles.suggestions}>
                    <Text style={[styles.suggestionsTitle, { color: colors.text }]}>Suggestions:</Text>
                    {suggestions.map((suggestion, idx) => (
                      <Text key={idx} style={[styles.suggestionItem, { color: colors.textSecondary }]}>
                        • {suggestion}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.feedbackButton, { backgroundColor: colors.border }]}
              onPress={handleGetFeedback}
              disabled={loading || answers.some(a => a.trim().length === 0)}>
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.feedbackButtonText}>Get Feedback</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: feedback ? colors.gold : colors.border }]}
              onPress={handleSubmit}
              disabled={!feedback}>
              <Text style={[styles.submitButtonText, { color: feedback ? '#000' : colors.textSecondary }]}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '70%',
  },
  questionCard: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  answerInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  feedbackCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  suggestions: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionItem: {
    fontSize: 13,
    marginLeft: 8,
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
