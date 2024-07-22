import axios from 'axios';

const useDiscordWebhook = (webhookUrl: string) => {
  const sendMessage = async (message: string) => {
    try {
      const response = await axios.post(webhookUrl, {
        content: message,
      });
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error message:', error.message);
        console.error('Axios error response:', error.response);
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  };

  return { sendMessage };
};

export default useDiscordWebhook;
