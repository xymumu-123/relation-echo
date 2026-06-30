import AsyncStorage from '@react-native-async-storage/async-storage';

class Storage {
    async get<T>(key: string): Promise<T | null> { try { const value = await AsyncStorage.getItem(key); return value ? JSON.parse(value) : null; } catch { return null; } }
    async set<T>(key: string, value: T): Promise<void> { await AsyncStorage.setItem(key, JSON.stringify(value)); }
    async remove(key: string): Promise<void> { await AsyncStorage.removeItem(key); }
    async getAllKeys(): Promise<readonly string[]> { return AsyncStorage.getAllKeys(); }
    async clear(): Promise<void> { await AsyncStorage.clear(); }
}

export const storage = new Storage();
