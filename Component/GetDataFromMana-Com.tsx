import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedData } from './types';
import { initializeGlobals } from '../App'

const loginAndScrape = async (
  setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  setLoading(true);
  setError(null);

  try {
    const LOGIN_URL = 'https://web.mana-com.jp/login';
    const TARGET_URL = 'https://web.mana-com.jp/info';

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

    const targetPageResponse = await axios.get(TARGET_URL, {
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
      setScrapedData(newNotices);
    } else {
      setScrapedData([]);
    }
  } catch (error) {
    setError(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setLoading(false);
  }
};

const ScrapeComponent: React.FC = () => {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newTitle, setNewTitle] = useState<string>('');

  useEffect(() => {
    loginAndScrape(setScrapedData, setError, setLoading);
    initializeGlobals(setScrapedData, setError, setLoading);
  }, []);

  const handleTitleChange = async (title: string) => {
    await AsyncStorage.setItem("Mana-ComLastNoticeTitle", title);
    console.log(await AsyncStorage.getItem("Mana-ComLastNoticeTitle"));
    setNewTitle('');
  };

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
              <Text>URL: {notice.url}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text>新しいお知らせはありません</Text>
      )}
      <TextInput
        style={styles.input}
        value={newTitle}
        onChangeText={setNewTitle}
        placeholder="新しいタイトルを入力"
      />
      <Button
        title="タイトルを変更"
        onPress={() => handleTitleChange(newTitle)}
        disabled={loading || !newTitle}
      />
      <Button
        title="再読み込み"
        onPress={() => loginAndScrape(setScrapedData, setError, setLoading)}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  noticeItem: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  noticeTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
});




export default ScrapeComponent;
