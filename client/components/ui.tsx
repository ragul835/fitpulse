import { ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors, radius } from "../lib/theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{children}</Text>
      {right}
    </View>
  );
}

export function Pill({ label, color = colors.primary, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: bg || `${color}22` }}>
      <Text style={{ color, fontSize: 11.5, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
}) {
  const bg =
    variant === "primary" ? colors.primary : variant === "danger" ? colors.redSoft : variant === "outline" ? "transparent" : colors.card2;
  const fg = variant === "primary" ? "#06240f" : variant === "danger" ? "#fca5a5" : colors.text;
  const border = variant === "outline" ? colors.border : "transparent";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "outline" ? 1 : 0,
          paddingVertical: 13,
          paddingHorizontal: 18,
          borderRadius: radius.sm,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg, fontWeight: "800", fontSize: 15 }}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#06240f", fontWeight: "800", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label && <Text style={{ color: colors.textFaint }}>{label}</Text>}
    </View>
  );
}

export function Empty({ title, hint, emoji }: { title: string; hint?: string; emoji?: string }) {
  return (
    <View style={{ alignItems: "center", padding: 32, gap: 6 }}>
      {emoji && <Text style={{ fontSize: 34, marginBottom: 4 }}>{emoji}</Text>}
      <Text style={{ color: colors.textDim, fontSize: 15, fontWeight: "700" }}>{title}</Text>
      {hint && <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center" }}>{hint}</Text>}
    </View>
  );
}

export function Stat({ label, value, color, style }: { label: string; value: string; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View>
      <Text style={{ color: color || colors.text, fontWeight: "800", fontSize: 20 }}>{value}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 1 }}>{label}</Text>
    </View>
  );
}
