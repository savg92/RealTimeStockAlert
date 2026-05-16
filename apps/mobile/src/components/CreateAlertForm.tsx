import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { AlertCondition } from '@stock-alert/shared';

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
    <View className="mb-6 rounded-lg border border-border bg-background-secondary p-4">
      <Text className="mb-3 text-lg font-bold text-text">Create Alert</Text>

      <Text className="mb-1 text-xs text-text-secondary">Symbol</Text>
      <TextInput
        value={symbol}
        onChangeText={setSymbol}
        autoCapitalize="characters"
        placeholder="AAPL"
        className="mb-3 rounded-lg border border-border bg-white px-3 py-2 text-text"
      />

      <Text className="mb-1 text-xs text-text-secondary">Target Price</Text>
      <TextInput
        value={threshold}
        onChangeText={setThreshold}
        keyboardType="decimal-pad"
        placeholder="200"
        className="mb-3 rounded-lg border border-border bg-white px-3 py-2 text-text"
      />

      <View className="mb-3 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-lg px-3 py-2 ${condition === 'above' ? 'bg-primary' : 'bg-border'}`}
          onPress={() => setCondition('above')}
        >
          <Text className={`text-center font-semibold ${condition === 'above' ? 'text-white' : 'text-text'}`}>
            Above
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-lg px-3 py-2 ${condition === 'below' ? 'bg-primary' : 'bg-border'}`}
          onPress={() => setCondition('below')}
        >
          <Text className={`text-center font-semibold ${condition === 'below' ? 'text-white' : 'text-text'}`}>
            Below
          </Text>
        </TouchableOpacity>
      </View>

      {formError && <Text className="mb-2 text-sm text-danger">{formError}</Text>}

      <TouchableOpacity
        className={`rounded-lg px-4 py-3 ${isSubmitting ? 'bg-border' : 'bg-primary'}`}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text className="text-center font-semibold text-white">
          {isSubmitting ? 'Creating…' : 'Create Alert'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
