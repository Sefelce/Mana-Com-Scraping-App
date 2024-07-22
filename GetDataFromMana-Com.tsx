// ScrapeComponent.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import axios from 'axios';
import * as cheerio from 'cheerio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGIN_URL = 'https://web.mana-com.jp/login';
const TARGET_URL = 'https://web.mana-com.jp/info';
const USERNAME = '';
const PASSWORD = '';

interface ScrapedData {
  title: string;
  date: string;
  status: string;
  url: string | null;
}

const ScrapeComponent: React.FC = () => {
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loginAndScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. ログインページにアクセスしてCSRFトークンを取得
      const loginPageResponse = await axios.get(LOGIN_URL);
      const $ = cheerio.load(loginPageResponse.data);
      const csrfToken = $('input[name="_token"]').val();
      if (!csrfToken) {
        throw new Error('CSRFトークンが見つかりません');
      }

      // 2. ログインリクエストを送信
      const loginResponse = await axios.post(
        LOGIN_URL,
        `login_id=${USERNAME}&password=${PASSWORD}&_token=${csrfToken}`,
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

      // セッションクッキーを保存
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        await AsyncStorage.setItem('sessionCookie', cookies.join('; '));
      }

      // 3. ログイン後のページにアクセスして情報を取得
      const targetPageResponse = await axios.get(TARGET_URL, {
        headers: {
          Cookie: await AsyncStorage.getItem('sessionCookie') || ''
        }
      });

      const htmlContent = targetPageResponse.data;
      const $$ = cheerio.load(htmlContent);

      // テーブルの最初の行を取得
      const firstRow = $$('#infoList tr').first();
      if (firstRow.length > 0) {
        const cells = firstRow.find('td');
        if (cells.length > 0) {
          const titleElement = cells.eq(0).find('span:nth-child(2)');
          const dateElement = cells.eq(0).find('span:nth-child(3)');
          const statusElement = cells.eq(1).find('span:nth-child(2)');
          const url = firstRow.attr('data-href') || null; // ここを修正

          const title = titleElement.text().trim() || 'タイトルなし';
          const date = dateElement.text().trim() || '日付なし';
          const status = statusElement.text().trim() || 'ステータスなし';

          setScrapedData({ title, date, status, url });
        } else {
          throw new Error('最初の行にデータがありません');
        }
      } else {
        throw new Error('お知らせの行が見つかりません');
      }
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
    <View style={{ padding: 20 }}>
      {loading ? (
        <Text>読み込み中...</Text>
      ) : error ? (
        <Text style={{ color: 'red' }}>エラー: {error}</Text>
      ) : scrapedData ? (
        <View>
          <Text>タイトル: {scrapedData.title}</Text>
          <Text>日付: {scrapedData.date}</Text>
          <Text>ステータス: {scrapedData.status}</Text>
          <Text>URL: {scrapedData.url || 'なし'}</Text>
        </View>
      ) : null}
      <Button title="再読み込み" onPress={loginAndScrape} disabled={loading} />
    </View>
  );
};

export default ScrapeComponent;

// App.tsx の内容は変更ありません
