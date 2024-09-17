import 'react-native-gesture-handler';
import {StyleSheet} from 'react-native';
import {Provider as PaperProvider, IconButton} from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import ManacomData from './Component/SaveMana-ComAccountData';
import {WriteDiscordWebHookUrl} from './Component/WriteDiscordWebhookUrl';
import {ScrapedData} from './Component/types';
import {LicensesScreen} from './Component/License';
// グローバル変数を使用するための関数
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
          <Drawer.Screen name="マナコムアカウント" component={ManacomData}/>
          <Drawer.Screen name="ライセンス" component={LicensesScreen}/>
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};





const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 20,
  },
});

export default App;
