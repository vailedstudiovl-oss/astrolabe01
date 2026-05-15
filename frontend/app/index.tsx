import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
const ASTROLABE_URL = `${EXPO_PUBLIC_BACKEND_URL}/api/astrolabe`;

export default function Index() {
  const [loading, setLoading] = useState(true);

  // On web (Expo Web preview) WebView falls back to an iframe, which works
  // perfectly for rendering an external HTML page hosted by our FastAPI backend.
  // On iOS/Android (Expo Go) react-native-webview renders a native WebView.
  return (
    <View style={styles.container} testID="astrolabe-root">
      {Platform.OS === "web" ? (
        <iframe
          src={ASTROLABE_URL}
          style={webStyles.iframe as unknown as React.CSSProperties}
          title="Dimensionlock Astrolabe Terminal"
          allow="fullscreen"
        />
      ) : (
        <WebView
          testID="astrolabe-webview"
          source={{ uri: ASTROLABE_URL }}
          style={styles.webview}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay} testID="astrolabe-loading">
              <ActivityIndicator size="large" color="#00ffcc" />
              <Text style={styles.loadingText}>
                Initializing Astrolabe Database...
              </Text>
            </View>
          )}
        />
      )}
      {loading && Platform.OS !== "web" ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00ffcc" />
          <Text style={styles.loadingText}>
            Initializing Astrolabe Database...
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  webview: {
    flex: 1,
    backgroundColor: "#050505",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },
  loadingText: {
    marginTop: 12,
    color: "#00ffcc",
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 12,
    letterSpacing: 2,
  },
});

const webStyles = {
  iframe: {
    border: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "#050505",
  },
};
