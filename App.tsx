import 'react-native-gesture-handler';
import { Provider as PaperProvider, IconButton, Dialog, Portal, Button, Paragraph, TextInput,} from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import ManacomData from './Component/SaveMana-ComAccountData';
import { WriteDiscordWebHookUrl } from './Component/WriteDiscordWebhookUrl';
import { ScrapedData } from './types/types';
import { LicensesScreen } from './Component/License';
import { RegisterBackgroundTask } from './BackGroundTask/task';
import { useEffect, useState } from 'react';
import {View} from 'react-native';

let globalSetScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>;
let globalSetError: React.Dispatch<React.SetStateAction<string | null>>;
let globalSetLoading: React.Dispatch<React.SetStateAction<boolean>>;

export const initializeGlobals = (
  setScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  globalSetScrapedData = setScrapedData;
  globalSetError = setError;
  globalSetLoading = setLoading;
};

const Drawer = createDrawerNavigator();

const App = () => {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [error, setError] = useState<string | null>(null);  // エラーを管理するstate
  const [visible, setVisible] = useState(false);  // ダイアログ表示の制御
  
  useEffect(() => {
    const runTask = async () => {
      try {
        await RegisterBackgroundTask(setScrapedData);
      } catch (err: any) {
        setError(err.message || 'エラーが発生しました');
        setVisible(true);
      }
    };
  
    runTask();
  }, []);
  

  const hideDialog = () => setVisible(false); // ダイアログを非表示にする関数

  return (
    <PaperProvider>
      <NavigationContainer>
        <Drawer.Navigator
          initialRouteName="マナコムアカウント"
          screenOptions={({ navigation }) => ({
            headerLeft: () => (
              <IconButton
                icon="menu"
                onPress={() => navigation.toggleDrawer()}
              />
            ),
          })}
        >
          <Drawer.Screen name="Discordの設定" component={WriteDiscordWebHookUrl} />
          <Drawer.Screen name="マナコムアカウント" component={ManacomData} />
          <Drawer.Screen name="ライセンス" component={LicensesScreen} />
          <Drawer.Screen name="テスト用" component={TestComponent} />
        </Drawer.Navigator>
      </NavigationContainer>

      {/* ダイアログ */}
      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>エラー</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{error}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>閉じる</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </PaperProvider>
  );
};

import * as React from 'react';

const TestComponent = () => {
  const [text, setText] = React.useState("");

  return (
    <View>
      <TextInput
        value={text}
        onChangeText={text => setText(text)}
      />
      <Button icon="camera" mode="contained" onPress={() => console.log(setText)}>
        Press me
      </Button>
    </View>
  );
};

export default App;
