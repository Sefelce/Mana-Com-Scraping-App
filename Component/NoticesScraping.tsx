import axios from 'axios';

type UrlStatus = {
  url: string;
  status: number | string;
};

const NoticesScraping = async (urls: string[]): Promise<UrlStatus[]> => {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await axios.get(url);
        return { url, status: response.status };
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          return { url, status: error.response.status };
        }
        return { url, status: 'Error' };
      }
    })
  );
  return results;
};

export default NoticesScraping;
