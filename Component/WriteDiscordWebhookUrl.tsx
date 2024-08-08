import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useDiscordWebhook from '../hooks/useDiscordWebhook';
import { TextInput, Button, Text, Provider as PaperProvider, Dialog, Portal, Paragraph, IconButton } from 'react-native-paper';



export const WriteDiscordWebHookUrl = () => {
    const [text, setText] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [visible, setVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
  
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
        } else {
          setAlertMessage("URLが登録されていません");
          setVisible(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
  
    useEffect(() => {
      getData();
    }, []);
  
    const { sendMessage } = useDiscordWebhook(webhookUrl);
  
    const handleSendMessage = async () => {
      if (!text) {
        setAlertMessage('エラー: Webhook URLが空です');
        setVisible(true);
        return;
      }
  
      const now = new Date();
      const message = `現在時刻: ${now.toLocaleString()}`;
  
      try {
        await writeData("discordWebHookUrl", text);
        const newWebhookUrl = await AsyncStorage.getItem('discordWebHookUrl');
        if (newWebhookUrl) {
          const { sendMessage: newSendMessage } = useDiscordWebhook(newWebhookUrl);
          await newSendMessage(message);
          setAlertMessage('成功: メッセージが送信されました');
          setWebhookUrl(newWebhookUrl); // 更新されたURLをステートにセット
        } else {
          setAlertMessage('エラー: 保存されたURLが取得できません');
        }
      } catch (error) {
        setAlertMessage('エラー: メッセージの送信に失敗しました');
      } finally {
        setVisible(true);
      }
    };
  
    const hideDialog = () => setVisible(false);
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Send Current Time to Discord</Text>
        <TextInput
          mode="outlined"
          label="Webhook URL"
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type your Discord Webhook URL"
        />
        <Button mode="contained" onPress={handleSendMessage}>
          Send Current Time
        </Button>
        <Portal>
          <Dialog visible={visible} onDismiss={hideDialog}>
            <Dialog.Title>Notification</Dialog.Title>
            <Dialog.Content>
              <Paragraph>{alertMessage}</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={hideDialog}>OK</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    );
  };

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 20,
  },
});

export default WriteDiscordWebHookUrl;