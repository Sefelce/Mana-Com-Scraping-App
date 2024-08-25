import axios from 'axios';
import * as cheerio from 'cheerio';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UrlStatus = {
  url: string;
  status: number | string;
  content: string; // 指定されたdivタグの中身を追加
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

export const NoticesScraping = async (urls: string[]): Promise<UrlStatus[]> => {
  const results: UrlStatus[] = [];

  for (const url of urls) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let noticesTitle = $('#info_title').text(); 
      let divContent = $('#info_body').text();

      // <br>タグを取り除く
      divContent = divContent.replace(/<br\s*\/?>/gi, '');

      // 余分なスペースを削除
      noticesTitle = noticesTitle.replace(/\s+/g, ' ').trim();

      if (noticesTitle) {
        divContent = `------------------------\n${noticesTitle}\n------------------------\n\n${divContent}`;
      }

      console.log(noticesTitle);
      console.log(divContent);

      const webhookUrl = await AsyncStorage.getItem('discordWebHookUrl');
      if (webhookUrl) {
        // Discordにメッセージを送信
        if (divContent) {
          await sendToDiscord(webhookUrl, divContent);
        }
      }

      results.push({ url, status: response.status, content: divContent });

      // 次のリクエストの前に1秒待つ
      await wait(1000);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        results.push({ url, status: error.response.status, content: '' });
      } else {
        results.push({ url, status: 'Error', content: '' });
      }
    }
  }

  return results;
};



export default NoticesScraping;
