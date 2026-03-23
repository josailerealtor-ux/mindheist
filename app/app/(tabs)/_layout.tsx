import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6C47FF', headerShown: false }}>
      <Tabs.Screen name="feed" options={{ title: 'Discover' }} />
      <Tabs.Screen name="builder" options={{ title: 'Build' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
