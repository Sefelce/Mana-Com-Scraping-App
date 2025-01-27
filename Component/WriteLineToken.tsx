import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput, MD3LightTheme } from 'react-native-paper';

export const WriteLineToken = () => {
  const [text, setText] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem('LineToken');
      if (value !== null) {
        setWebhookUrl(value);
        setText(value);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const LineTokenChange = async (text: string) => {
    setText(text);
    await AsyncStorage.setItem("LineToken", text);
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="LINE Token"
        style={styles.input}
        value={text}
        onChangeText={LineTokenChange}
        placeholder="LINEのトークンを入力..."
        theme={customTheme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  input: {
    marginBottom: 20,
  },
});

const customTheme = {
  ...MD3LightTheme,
  dark: false, // ダークモードを無効化
  colors: {
    ...MD3LightTheme.colors,
    // 必要に応じてカスタムカラーを追加
  },
};
