import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import HTMLParser from 'react-native-html-parser';
import { NoticesScraping } from '../Component/NoticesScraping';
import { ScrapedData } from '../types/types';
// Discordにメッセージを送信する関数
const sendToDiscord = async (webhookUrl: string, message: string) => {
  const maxLength = 2000;
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    if (message.length <= maxLength) {
      await axios.post(webhookUrl, { content: message });
    } else {
      const parts = Math.ceil(message.length / maxLength);
      for (let i = 0; i < parts; i++) {
        const part = message.slice(i * maxLength, (i + 1) * maxLength);
        await axios.post(webhookUrl, { content: part });
        await wait(1000);
      }
    }
  } catch (error) {
    throw new Error('Discord送信中にエラーが発生しました:');
  }
};

// ログインとスクレイピング処理
const loginAndScrape = async (
  setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>
): Promise<void> => {
  const LOGIN_URL = 'https://web.mana-com.jp/login';
  const TARGET_URL = 'https://web.mana-com.jp/info';

  try {
    const [username, password, lastNoticeTitle, discordWebHookUrl] = await Promise.all([
      AsyncStorage.getItem('ManaComUsername'),
      AsyncStorage.getItem('ManaComPassword'),
      AsyncStorage.getItem('Mana-ComLastNoticeTitle'),
      AsyncStorage.getItem('discordWebHookUrl'),
    ]);

    if (!username || !password) {
      throw new Error('ユーザー名またはパスワードが設定されていません');
    }

    const loginPageResponse: AxiosResponse<string> = await axios.get(LOGIN_URL);
    const domParser = new HTMLParser.DOMParser();
    const document = domParser.parseFromString(loginPageResponse.data, 'text/html');
    const csrfToken = document.querySelector('input[name="_token"]')?.getAttribute('value');

    if (!csrfToken) {
      throw new Error('CSRFトークンが見つかりません');
    }

    const loginResponse = await axios.post(
      LOGIN_URL,
      `login_id=${username}&password=${password}&_token=${csrfToken}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    if (loginResponse.status !== 200) {
      throw new Error('ログインに失敗しました');
    }

    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      await AsyncStorage.setItem('sessionCookie', cookies.join('; '));
    }

    const targetPageResponse = await axios.get(TARGET_URL, {
      headers: { Cookie: (await AsyncStorage.getItem('sessionCookie')) || '' },
    });

    const targetDocument = domParser.parseFromString(targetPageResponse.data, 'text/html');
    const rows = targetDocument.querySelectorAll('#infoList tr');
    const newNotices: ScrapedData[] = [];
    let foundLastNotice = false;

    rows.forEach((row: any) => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        const title =
          cells[0]?.querySelector('span:nth-child(2)')?.textContent?.trim() || 'タイトルなし';
        const date =
          cells[0]?.querySelector('span:nth-child(3)')?.textContent?.trim() || '日付なし';
        const status =
          cells[1]?.querySelector('span:nth-child(2)')?.textContent?.trim() || 'ステータスなし';
        const url = row.getAttribute('data-href') || null;

        if (title === lastNoticeTitle) {
          foundLastNotice = true;
          return false; // ループを終了
        }

        newNotices.push({ title, date, status, url });
      }
    });

    if (!foundLastNotice && newNotices.length > 0) {
      await AsyncStorage.setItem('Mana-ComLastNoticeTitle', newNotices[0].title);
      const urls = newNotices.map(notice => notice.url).filter(url => url !== null) as string[];
      await NoticesScraping(urls);
    }

    setScrapedData(newNotices);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const discordWebHookUrl = await AsyncStorage.getItem('discordWebHookUrl');
    throw new Error(errorMessage);
    setScrapedData([]);
  }
};

// バックグラウンドタスクの登録
export const RegisterBackgroundTask = async (
  setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>
) => {
  const TASK_NAME = 'BACKGROUND_TASK';

  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await loginAndScrape(setScrapedData);
      return BackgroundFetch.Result.NewData;
    } catch (error) {
      console.error('バックグラウンドタスクの実行に失敗しました:', error);
      return BackgroundFetch.Result.Failed;
    }
  });

  BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: 60 * 5,
    stopOnTerminate: false,
    startOnBoot: true,
  }).catch(err => console.error('タスクの登録に失敗しました:', err));
};
