import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProviders } from "../src/providers/AppProviders";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="product/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="category/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="slider"
              options={{
                animation: "fade",
                presentation: "fullScreenModal",
                orientation: "all",
              }}
            />
            <Stack.Screen
              name="presentation/[productId]"
              options={{
                animation: "fade",
                presentation: "fullScreenModal",
                orientation: "all",
              }}
            />
          </Stack>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
