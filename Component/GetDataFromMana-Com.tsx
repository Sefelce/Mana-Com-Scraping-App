import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import axios from 'axios';
import * as cheerio from 'cheerio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoticesScraping from './NoticesScraping'; // 先ほどの関数をインポート

const LOGIN_URL = 'https://web.mana-com.jp/login';
const TARGET_URL = 'https://web.mana-com.jp/info';

interface ScrapedData {
  title: string;
  date: string;
  status: string;
  url: string | null;
}

const ScrapeComponent: React.FC = () => {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loginAndScrape = async () => {
    setLoading(true);
    setError(null);

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
        setScrapedData(newNotices);
        console.log('新しいお知らせ:', newNotices);

        // 新しいお知らせのURLにアクセス
        const urls = newNotices.map(notice => notice.url).filter(url => url !== null) as string[];
        const urlStatuses = await NoticesScraping(urls);
        console.log('URLのステータス:', urlStatuses);
      } else {
        setScrapedData([]);
        console.log('新しいお知らせはありません');
      }

      console.log('最後に表示したお知らせのタイトル:', await AsyncStorage.getItem("Mana-ComLastNoticeTitle"));
    } catch (error) {
      setError(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loginAndScrape();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>読み込み中...</Text>
      ) : error ? (
        <Text style={styles.error}>エラー: {error}</Text>
      ) : scrapedData.length > 0 ? (
        <ScrollView>
          {scrapedData.map((notice, index) => (
            <View key={index} style={styles.noticeItem}>
              <Text style={styles.noticeTitle}>タイトル: {notice.title}</Text>
              <Text>日付: {notice.date}</Text>
              <Text>ステータス: {notice.status}</Text>
              <Text>URL: {notice.url || 'なし'}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text>新しいお知らせはありません</Text>
      )}
      <Button title="再読み込み" onPress={loginAndScrape} disabled={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  error: {
    color: 'red',
  },
  noticeItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  noticeTitle: {
    fontWeight: 'bold',
  },
});

export default ScrapeComponent;
