import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';

interface License {
  licenses: string;
  repository: string;
  licenseUrl: string;
  parents: string;
}

export const LicensesScreen: React.FC = () => {
  const [licenses, setLicenses] = useState<{ [key: string]: License }>({});

  useEffect(() => {
    const loadLicenses = async () => {
      const licensesJson = require('../assets/licenses.json');
      setLicenses(licensesJson);
    };

    loadLicenses();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {Object.entries(licenses).map(([name, license]) => (
        <View key={name} style={styles.licenseContainer}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.text}>{`License: ${license.licenses}`}</Text>
          <Text style={styles.text}>{`Repository: ${license.repository}`}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  licenseContainer: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 14,
  },
});

