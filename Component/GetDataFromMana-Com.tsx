import React, { useState} from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrapedData } from './types';


const ScrapeComponent: React.FC = () => {
  const [scrapedData] = useState<ScrapedData[]>([]);
  const [newTitle, setNewTitle] = useState<string>('');

  const handleTitleChange = async (title: string) => {
    await AsyncStorage.setItem("Mana-ComLastNoticeTitle", title);
    console.log(await AsyncStorage.getItem("Mana-ComLastNoticeTitle"));
  };

  return (
    <View style={styles.container}>
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
      <TextInput
        style={styles.input}
        value={newTitle}
        onChangeText={setNewTitle}
        placeholder="新しいタイトルを入力"
      />
      <Button
        title="タイトルを変更"
        onPress={() => handleTitleChange(newTitle)}
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
