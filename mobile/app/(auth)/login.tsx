import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "../../lib/auth";
import { ApiError, loginWithSocial } from "../../lib/api";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const WHITE = "#ffffff";

export default function LoginScreen() {
  const { signIn, signInWithResponse } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signIn(trimmedEmail, password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Incorrect email or password. Try again.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setError("Can't reach the server. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token from Apple");
      }

      // Extract name from Apple's fullName object (only present on first sign-in)
      const name =
        credential.fullName?.givenName && credential.fullName?.familyName
          ? `${credential.fullName.givenName} ${credential.fullName.familyName}`.trim()
          : credential.fullName?.givenName ?? null;

      const response = await loginWithSocial({
        provider: "apple",
        idToken: credential.identityToken,
        appleUserId: credential.user,
        email: credential.email,
        name,
      });

      signInWithResponse(response);
    } catch (err) {
      if (err instanceof Error && err.message === "ERR_REQUEST_CANCELED") {
        // User cancelled — no error shown
      } else if (err instanceof ApiError) {
        const body = err.body as { error?: string; code?: string } | null;
        if (body?.code === "APPLE_NO_EMAIL") {
          setError("Please sign in with Apple again and allow email access.");
        } else {
          setError(body?.error ?? "Apple sign-in failed. Please try again.");
        }
      } else {
        setError("Apple sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.brand}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require("../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Poll City</Text>
            <Text style={styles.tagline}>Campaign field operations</Text>
          </View>

          {/* Sign-in card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to your account</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@campaign.ca"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                accessibilityLabel="Email address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
                accessibilityLabel="Password"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>

            {/* Apple Sign-In — iOS only, App Store requirement */}
            {Platform.OS === "ios" && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                  cornerRadius={14}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </>
            )}
          </View>

          <Text style={styles.footer}>
            Need access? Contact your campaign manager.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: NAVY,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "center",
  },
  brand: {
    alignItems: "center",
    marginBottom: 44,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: WHITE,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: "rgba(226,75,74,0.15)",
    borderWidth: 1,
    borderColor: "rgba(226,75,74,0.35)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    textAlign: "center",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: WHITE,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  button: {
    height: 56,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "500",
  },
  appleButton: {
    height: 56,
    width: "100%",
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    marginTop: 28,
  },
});
