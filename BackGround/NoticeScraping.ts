import axios from 'axios';
import * as cheerio from 'cheerio';
import AsyncStorage from '@react-native-async-storage/async-storage';


const LOGIN_URL = 'https://web.mana-com.jp/login';
const TARGET_URL = 'https://web.mana-com.jp/info';

export const getManaComInfo = async () => {
  try {
    const username = await AsyncStorage.getItem('ManaComUsername');
    const password = await AsyncStorage.getItem('ManaComPassword');

    if (!username || !password) {
      throw new Error('ユーザー名またはパスワードが設定されていません');
    }

    const loginPageResponse = await axios.get(LOGIN_URL);
    const $ = cheerio.load(loginPageResponse.data);
    const csrfToken = $('input[name="_token"]').val();
    if (!csrfToken) {
      throw new Error('CSRFトークンが見つかりません');
    }

    const loginResponse = await axios.post(
      LOGIN_URL,
      `login_id=${username}&password=${password}&_token=${csrfToken}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'axios/1.7.2'
        }
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
      headers: {
        Cookie: await AsyncStorage.getItem('sessionCookie') || ''
      }
    });

    const htmlContent = targetPageResponse.data;
    const $$ = cheerio.load(htmlContent);

    const lastNoticeTitle = await AsyncStorage.getItem("Mana-ComLastNoticeTitle");

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
          return false;
        }

        newNotices.push({ title, date, status, url });
      }
    });

    if (newNotices.length > 0) {
      await AsyncStorage.setItem("Mana-ComLastNoticeTitle", newNotices[0].title);
    }

    return newNotices; // 新しいお知らせのリストを返す

  } catch (error) {
    console.error(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

