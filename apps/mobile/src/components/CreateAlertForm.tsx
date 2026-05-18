import React from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AlertCondition } from '@stock-alert/shared';

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  fieldContainer: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  inputFocus: {
    borderColor: '#007bff',
    backgroundColor: '#fff',
  },
  conditionContainer: {
    marginBottom: 14,
    gap: 8,
  },
  conditionLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conditionButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    gap: 6,
  },
  conditionButtonActive: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  conditionButtonTextActive: {
    color: '#007bff',
  },
  errorMessage: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8d7da',
    borderLeftWidth: 3,
    borderLeftColor: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#e9ecef',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  submitButtonTextDisabled: {
    color: '#6c757d',
  },
});

export interface CreateAlertFormPayload {
  symbol: string;
  threshold: number;
}

export const validateCreateAlertForm = (
  symbolInput: string,
  thresholdInput: string,
): { error: string } | { payload: CreateAlertFormPayload } => {
  const symbol = symbolInput.trim().toUpperCase();
  if (!symbol) {
    return { error: 'Symbol is required.' };
  }

  const threshold = Number(thresholdInput);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return { error: 'Threshold must be a positive number.' };
  }

  return {
    payload: {
      symbol,
      threshold,
    },
  };
};

interface CreateAlertFormProps {
  isSubmitting: boolean;
  onSubmit: (payload: CreateAlertFormPayload, condition: AlertCondition) => Promise<void>;
}

export default function CreateAlertForm({ isSubmitting, onSubmit }: CreateAlertFormProps) {
  const [symbol, setSymbol] = React.useState('');
  const [threshold, setThreshold] = React.useState('');
  const [condition, setCondition] = React.useState<AlertCondition>('above');
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    const validation = validateCreateAlertForm(symbol, threshold);
    if ('error' in validation) {
      setFormError(validation.error);
      return;
    }

    setFormError(null);
    await onSubmit(validation.payload, condition);
    setSymbol('');
    setThreshold('');
  }, [condition, onSubmit, symbol, threshold]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Alert</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Symbol</Text>
        <TextInput
          value={symbol}
          onChangeText={setSymbol}
          autoCapitalize="characters"
          placeholder="e.g., AAPL"
          placeholderTextColor="#adb5bd"
          style={styles.input}
          editable={!isSubmitting}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Target Price</Text>
        <TextInput
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="decimal-pad"
          placeholder="e.g., 150.00"
          placeholderTextColor="#adb5bd"
          style={styles.input}
          editable={!isSubmitting}
        />
      </View>

      <View style={styles.conditionContainer}>
        <Text style={styles.conditionLabel}>Condition</Text>
        <View style={styles.conditionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.conditionButton,
              condition === 'above' && styles.conditionButtonActive,
            ]}
            onPress={() => setCondition('above')}
            disabled={isSubmitting}
          >
            <Ionicons 
              name="arrow-up" 
              size={16} 
              color={condition === 'above' ? '#007bff' : '#495057'} 
            />
            <Text
              style={[
                styles.conditionButtonText,
                condition === 'above' && styles.conditionButtonTextActive,
              ]}
            >
              Above
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.conditionButton,
              condition === 'below' && styles.conditionButtonActive,
            ]}
            onPress={() => setCondition('below')}
            disabled={isSubmitting}
          >
            <Ionicons 
              name="arrow-down" 
              size={16} 
              color={condition === 'below' ? '#007bff' : '#495057'} 
            />
            <Text
              style={[
                styles.conditionButtonText,
                condition === 'below' && styles.conditionButtonTextActive,
              ]}
            >
              Below
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {formError && (
        <View style={styles.errorMessage}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Ionicons 
          name={isSubmitting ? 'hourglass-outline' : 'add-circle-outline'}
          size={18}
          color={isSubmitting ? '#6c757d' : '#fff'}
        />
        <Text style={[styles.submitButtonText, isSubmitting && styles.submitButtonTextDisabled]}>
          {isSubmitting ? 'Creating…' : 'Create Alert'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
