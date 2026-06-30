import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { storage } from '../utils/storage';
import ConversationListScreen from '../screens/ConversationListScreen';
import ChatScreen from '../screens/ChatScreen';
import MemoryScreen from '../screens/MemoryScreen';
import MemoryGraphScreen from '../screens/MemoryGraphScreen';
import CharacterScreen from '../screens/CharacterScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();
const MemoryStack = createNativeStackNavigator();
const tabIcons: Record<string, string> = { ChatTab: '💬', Memory: '🧠', Character: '👤', Settings: '⚙️' };

function ChatStackNavigator() {
    return (
        <ChatStack.Navigator screenOptions={{ headerShown: false }}>
            <ChatStack.Screen name="ConversationList" component={ConversationListScreen} options={{ title: '对话' }} />
            <ChatStack.Screen name="ChatDetail" component={ChatScreen} />
        </ChatStack.Navigator>
    );
}

function MemoryStackNavigator() {
    return (
        <MemoryStack.Navigator screenOptions={{ headerShown: false }}>
            <MemoryStack.Screen name="MemoryList" component={MemoryScreen} />
            <MemoryStack.Screen name="MemoryGraph" component={MemoryGraphScreen} options={{ title: '记忆图谱' }} />
        </MemoryStack.Navigator>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator screenOptions={({ route, navigation }) => {
            const state = navigation.getState();
            const chatTab = state?.routes?.find(r => r.name === 'ChatTab');
            const chatState = chatTab?.state;
            const isInChatDetail = chatState?.routes?.[chatState.index ?? 0]?.name === 'ChatDetail';
            return {
                tabBarIcon: ({ focused }) => (
                    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{tabIcons[route.name] || '📱'}</Text>
                ),
                tabBarActiveTintColor: '#6C63FF',
                tabBarInactiveTintColor: '#999',
                tabBarStyle: isInChatDetail ? { display: 'none' } : { paddingBottom: 4, height: 56 },
                tabBarItemStyle: { paddingVertical: 4 },
                headerStyle: { backgroundColor: '#6C63FF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            };
        }}>
            <Tab.Screen name="ChatTab" component={ChatStackNavigator} options={{ title: '对话', headerShown: false }} />
            <Tab.Screen name="Memory" component={MemoryStackNavigator} options={{ title: '记忆', headerShown: false }} />
            <Tab.Screen name="Character" component={CharacterScreen} options={{ title: '角色' }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

    useEffect(() => {
        storage.get<boolean>('onboarding_complete').then(val => setIsOnboarded(val === true));
    }, []);

    if (isOnboarded === null) return null;

    return (
        <NavigationContainer>
            {isOnboarded ? <MainTabs /> : <OnboardingScreen onComplete={() => setIsOnboarded(true)} />}
        </NavigationContainer>
    );
}
