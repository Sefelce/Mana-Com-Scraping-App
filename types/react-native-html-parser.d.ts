declare module 'react-native-html-parser' {
  export class DOMParser {
    parseFromString(content: string, type: string): Document;
  }
}