import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput, Provider as PaperProvider, DefaultTheme } from 'react-native-paper';

const SavePage = ({ }) => {
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('ManaComUsername');
        const storedPassword = await AsyncStorage.getItem('ManaComPassword');
        setInputs({
          username: storedUsername || '',
          password: storedPassword || '',
        });
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };

    loadData();
  }, []);

  const handleTextChange = (text: string, key: string) => {
    const newInputs = { ...inputs, [key]: text };
    setInputs(newInputs);
    AsyncStorage.setItem(`ManaCom${key.charAt(0).toUpperCase() + key.slice(1)}`, text)
      .catch(e => {
        console.error('Failed to save data', e);
      });
  };

  return (
    <PaperProvider theme={DefaultTheme}>
      <View style={styles.container}>
        <TextInput
          mode="outlined"
          label="Username"
          style={styles.input}
          placeholder="Type your username"
          value={inputs.username}
          onChangeText={text => handleTextChange(text, 'username')}
        />
        <TextInput
          mode="outlined"
          label="Password"
          style={styles.input}
          placeholder="Type your password"
          secureTextEntry
          value={inputs.password}
          onChangeText={text => handleTextChange(text, 'password')}
        />
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  input: {
    marginBottom: 20,
  },
});

export default SavePage;
