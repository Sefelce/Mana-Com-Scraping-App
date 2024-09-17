import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import cheerio from 'cheerio';
import { NoticesScraping } from '../Component/NoticesScraping';
import { ScrapedData } from '../Component/types';

// loginAndScrape 関数に setScrapedData を引数として渡す
const loginAndScrape = async (
  setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>
): Promise<void> => {
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
      setScrapedData(newNotices);
    } else {
      setScrapedData([]);
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

  try {
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
  } catch (error) {
    console.error('Discord送信中にエラーが発生しました:', error);
  }
};

const TASK_NAME = "BACKGROUND_TASK";

// タスクを登録する関数に setScrapedData を渡すようにする
export function register_background_task(setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      const discordWebHookUrl = await AsyncStorage.getItem("discordWebHookUrl");

      if (discordWebHookUrl) {
        try {
          await loginAndScrape(setScrapedData);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
          await sendToDiscord(discordWebHookUrl, errorMessage);
        }
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
};
