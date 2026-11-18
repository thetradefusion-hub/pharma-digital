import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";

interface NetworkState {
  isOnline: boolean;
  bootstrapped: boolean;
  init: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  bootstrapped: false,
  init: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      set({ isOnline: online, bootstrapped: true });
    });
    return unsubscribe;
  },
}));
