import 'react-native-gesture-handler';
import {StyleSheet, View} from 'react-native';
import {Provider as PaperProvider, IconButton, Button } from 'react-native-paper';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import ScrapeComponent from './Component/GetDataFromMana-Com';
import ManacomData from './Component/SaveMana-ComAccountData';
import axios, { AxiosResponse } from 'axios';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

import {WriteDiscordWebHookUrl} from './Component/WriteDiscordWebhookUrl';
import { NoticesScraping } from './Component/NoticesScraping';
import cheerio from 'cheerio';
import {ScrapedData} from './Component/types';
import {LicensesScreen} from './Component/License';
// グローバル変数を使用するための関数
let globalSetScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>;
let globalSetError: React.Dispatch<React.SetStateAction<string | null>>;
let globalSetLoading: React.Dispatch<React.SetStateAction<boolean>>;

export const initializeGlobals = (
  setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  globalSetScrapedData = setScrapedData;
  globalSetError = setError;
  globalSetLoading = setLoading;
};





export const loginAndScrape = async (): Promise<void> => {
  try {
    const LOGIN_URL = 'https://web.mana-com.jp/login';
    const TARGET_URL = 'https://web.mana-com.jp/info';

    const username = await AsyncStorage.getItem('ManaComUsername');
    const password = await AsyncStorage.getItem('ManaComPassword');

    if (!username || !password) {
      throw new Error('ユーザー名またはパスワードが設定されていません');
    }

    const loginPageResponse: AxiosResponse<string> = await axios.get(LOGIN_URL);
    const $ = cheerio.load(loginPageResponse.data);
    const csrfToken = $('input[name="_token"]').val();

    if (!csrfToken) {
      throw new Error('CSRFトークンが見つかりません');
    }

    const loginResponse: AxiosResponse = await axios.post(
      LOGIN_URL,
      `login_id=${username}&password=${password}&_token=${csrfToken}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'axios/1.7.2',
        },
      }
    );

    if (loginResponse.status !== 200) {
      throw new Error('ログインに失敗しました');
    }

    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      await AsyncStorage.setItem('sessionCookie', cookies.join('; '));
    }

    const targetPageResponse: AxiosResponse<string> = await axios.get(TARGET_URL, {
      headers: {
        Cookie: (await AsyncStorage.getItem('sessionCookie')) || '',
      },
    });

    const htmlContent = targetPageResponse.data;
    const $$ = cheerio.load(htmlContent);

    const lastNoticeTitle = await AsyncStorage.getItem('Mana-ComLastNoticeTitle');

    const newNotices: ScrapedData[] = [];
    let foundLastNotice = false;

    $$('#infoList tr').each((index, element) => {
      const cells = $$(element).find('td');
      if (cells.length > 0) {
        const titleElement = cells.eq(0).find('span:nth-child(2)');
        const dateElement = cells.eq(0).find('span:nth-child(3)');
        const statusElement = cells.eq(1).find('span:nth-child(2)');
        const url = $$(element).attr('data-href') || null;

        const title = titleElement.text().trim() || 'タイトルなし';
        const date = dateElement.text().trim() || '日付なし';
        const status = statusElement.text().trim() || 'ステータスなし';

        if (title === lastNoticeTitle) {
          foundLastNotice = true;
          return false; // ループを終了
        }

        newNotices.push({ title, date, status, url });
      }
    });

    if (newNotices.length > 0) {
      await AsyncStorage.setItem('Mana-ComLastNoticeTitle', newNotices[0].title);

      // 新しいお知らせのURLを抽出
      const urls = newNotices.map(notice => notice.url).filter(url => url !== null) as string[];

      // NoticesScraping関数に配列を渡して実行
      const urlStatuses = await NoticesScraping(urls);
      
      console.log('URL statuses:', urlStatuses);

      // 必要に応じて、結果を保存や処理
      globalSetScrapedData(newNotices);
    } else {
      globalSetScrapedData([]);
    }
  } catch (error: unknown) {
    console.error('エラーが発生しました:', error);
  }
};




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
      loginAndScrape();

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
  minimumInterval: 60 * 5,
  stopOnTerminate: false, // アプリが終了してもタスクを停止しない
  startOnBoot: true, // デバイスが起動したときにタスクを開始する
}).catch(err => console.error("タスクの登録に失敗しました:", err));


const Drawer = createDrawerNavigator();


const Manacom = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ScrapeComponent/>
      <Button 
        mode="contained" 
        onPress={async () =>{
          await loginAndScrape();
        }}
      >
      Press me
    </Button>
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
          <Drawer.Screen name="Discordの設定" component={WriteDiscordWebHookUrl} />
          <Drawer.Screen name="お知らせ" component={Manacom} />
          <Drawer.Screen name="マナコムアカウント" component={ManacomData}/>
          <Drawer.Screen name="ライセンス" component={LicensesScreen}/>
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
