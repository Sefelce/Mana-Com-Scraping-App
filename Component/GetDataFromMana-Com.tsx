import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, StyleSheet, ScrollView } from 'react-native';
import { loginAndScrape, handleTitleChange } from '../Scrraping/ScrapeFunctions';  // 修正されたパス
import { ScrapedData } from './types';



const ScrapeComponent: React.FC = () => {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newTitle, setNewTitle] = useState<string>('');

  useEffect(() => {
    loginAndScrape(setScrapedData, setError, setLoading);
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
      <TextInput
        style={styles.input}
        value={newTitle}
        onChangeText={setNewTitle}
        placeholder="新しいタイトルを入力"
      />
      <Button
        title="タイトルを変更"
        onPress={() => handleTitleChange(newTitle, setNewTitle, setScrapedData, setError, setLoading)}
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
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});

export default ScrapeComponent;
