import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { ApiError } from "../lib/api";
import { colors, radius } from "../lib/theme";
import { Button } from "../components/ui";

export default function Login() {
  const { login, register } = useAuth();
  const { push } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      push("success", "Welcome to FitPulse ⚡");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, maxWidth: 480, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 32 }}>⚡</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 }}>FitPulse</Text>
          <Text style={{ color: colors.textDim, fontSize: 14, marginTop: 4 }}>Track workouts, activity & goals</Text>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.sm, padding: 4, marginBottom: 20 }}>
          {(["login", "register"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: radius.sm - 2,
                backgroundColor: mode === m ? colors.card2 : "transparent",
                alignItems: "center",
              }}
            >
              <Text style={{ color: mode === m ? colors.text : colors.textFaint, fontWeight: "700" }}>
                {m === "login" ? "Sign in" : "Sign up"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {err ? (
          <View style={{ backgroundColor: colors.redSoft, borderRadius: radius.sm, padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#fca5a5", fontSize: 13 }}>{err}</Text>
          </View>
        ) : null}

        {mode === "register" && (
          <Field label="Name">
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textFaint} style={inputStyle} />
          </Field>
        )}
        <Field label="Email">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            style={inputStyle}
          />
        </Field>
        <Field label="Password">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            style={inputStyle}
          />
        </Field>

        <Button title={mode === "login" ? "Sign in" : "Create account"} onPress={submit} loading={busy} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: "600", marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.bgSoft,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: colors.text,
  fontSize: 15,
} as const;
