import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors } from "../../src/theme/colors";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: focused ? "#E8F1FB" : "transparent",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 7,
        minWidth: 48,
        alignItems: "center",
      }}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const tabHeight = (Platform.OS === "ios" ? 54 : 60) + Math.max(insets.bottom, 8);

  if (bootstrapped && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#94A3B8",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: "#E8EEF5",
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingHorizontal: isTablet ? 48 : 8,
          maxWidth: isTablet ? 920 : undefined,
          alignSelf: isTablet ? "center" : undefined,
          width: isTablet ? "100%" : undefined,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 12 : 11,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarItemStyle: isTablet
          ? { paddingHorizontal: 12 }
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: "Products",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "cube" : "cube-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "bookmark" : "bookmark-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
