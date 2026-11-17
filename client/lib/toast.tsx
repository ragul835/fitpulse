import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { View, Text, Animated } from "react-native";
import { colors } from "./theme";

type Kind = "success" | "error" | "info" | "warn";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  message?: string;
}

const dot: Record<Kind, string> = {
  success: colors.primary,
  error: colors.red,
  warn: colors.amber,
  info: colors.cyan,
};

const ToastContext = createContext<{ push: (kind: Kind, title: string, message?: string) => void }>({
  push: () => {},
});

let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: Kind, title: string, message?: string) => {
    const id = seq++;
    setToasts((t) => [...t, { id, kind, title, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <View style={{ position: "absolute", top: 50, left: 0, right: 0, alignItems: "center", gap: 8 }} pointerEvents="none">
        {toasts.map((t) => (
          <View
            key={t.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.card2,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 15,
              maxWidth: 420,
              width: "90%",
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot[t.kind] }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{t.title}</Text>
              {t.message ? <Text style={{ color: colors.textDim, fontSize: 12.5, marginTop: 1 }}>{t.message}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
