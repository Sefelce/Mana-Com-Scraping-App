import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native-paper';

export const WriteDiscordWebHookUrl = () => {
  const [text, setText] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const writeData = async (keyName: string, value: string) => {
    try {
      await AsyncStorage.setItem(keyName, value);
    } catch (e) {
      console.error(e);
    }
  };

  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem('discordWebHookUrl');
      if (value !== null) {
        setWebhookUrl(value);
        setText(value); // 保存されているURLを入力欄にセット
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleTextChange = (text: string) => {
    setText(text);
    writeData('discordWebHookUrl', text);
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Webhook URL"
        style={styles.input}
        value={text}
        onChangeText={handleTextChange}
        placeholder="DiscordのWebhookURLを入力"
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

export default WriteDiscordWebHookUrl;
