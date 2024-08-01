import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, Provider as PaperProvider, Dialog, Portal, Paragraph, IconButton } from 'react-native-paper';
import useDiscordWebhook from './hooks/useDiscordWebhook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import ScrapeComponent from './Component/GetDataFromMana-Com';
import ManacomData from './Component/SaveMana-ComAccountData';
import axios from 'axios';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

import {getManaComInfo} from './BackGround/NoticeScraping';


// メッセージ送信の間隔を設定する関数
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Discordにメッセージを送信する関数
const sendToDiscord = async (webhookUrl: string, message: string) => {
  const maxLength = 2000;

  if (message.length <= maxLength) {
    await axios.post(webhookUrl, { content: message });
  } else {
    const parts = Math.ceil(message.length / maxLength);
    for (let i = parts - 1; i >= 0; i--) {
      const part = message.slice(i * maxLength, (i + 1) * maxLength);
      await axios.post(webhookUrl, { content: part });
      await wait(1000); // メッセージ送信間の待機時間を追加
    }
  }
};

const TASK_NAME = "BACKGROUND_TASK";

// タスクの定義
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const discordWebHookUrl = await AsyncStorage.getItem("discordWebHookUrl");
    
    if (discordWebHookUrl) {
      await sendToDiscord(discordWebHookUrl, "バックグラウンドテスト");
    }
    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error("バックグラウンドタスクの実行に失敗しました:", error);
    return BackgroundFetch.Result.Failed;
  }
});

// タスクの登録
BackgroundFetch.registerTaskAsync(TASK_NAME, {
  //24時間
  minimumInterval: 60 * 60 * 24,
  stopOnTerminate: false, // アプリが終了してもタスクを停止しない
  startOnBoot: true, // デバイスが起動したときにタスクを開始する
}).catch(err => console.error("タスクの登録に失敗しました:", err));


const Drawer = createDrawerNavigator();


const Manacom = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ScrapeComponent/>
    </View>
  );
};


const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
};

const WriteDiscordWebHookUrl = () => {
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



const MainScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedNotices = await getManaComInfo();
      console.log('取得したお知らせ:', fetchedNotices);
    } catch (error) {
      setError(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button onPress={fetchNotices} mode="contained">お知らせを取得</Button>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
};







const WriteLineToken = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>LINE Token Screen</Text>
    </View>
  );
};




const App = () => {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Drawer.Navigator
          initialRouteName="マナコムアカウント"
          screenOptions={({ navigation }) => ({
            headerLeft: () => (
              <IconButton
                icon="menu"
                onPress={() => navigation.toggleDrawer()}
              />
            ),
          })}
        >
          <Drawer.Screen name="Main" component={MainScreen} />
          {/* <Drawer.Screen name="Home" component={HomeScreen} /> */}
          <Drawer.Screen name="Discordの設定" component={WriteDiscordWebHookUrl} />
          {/* <Drawer.Screen name="LINEの設定" component={WriteLineToken} /> */}
          <Drawer.Screen name="マナコムのお知らせ" component={Manacom} />
          <Drawer.Screen name="マナコムアカウント" component={ManacomData}/>
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
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

export default App;
