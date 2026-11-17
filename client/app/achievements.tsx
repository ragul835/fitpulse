import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { colors } from "../lib/theme";
import { num } from "../lib/format";
import { Card, Loading } from "../components/ui";
import type { Achievements as Ach } from "../lib/types";

const TIER_COLOR: Record<string, string> = { bronze: "#d97706", silver: "#94a3b8", gold: "#fbbf24" };

export default function Achievements() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<Ach | null>(null);

  useEffect(() => {
    api.get<Ach>("/api/achievements").then(setData).catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Achievements</Text>
      </View>

      {!data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}>
          {/* Summary */}
          <Card style={{ marginBottom: 16, alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>🏆</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 6 }}>
              {data.unlockedCount} / {data.total}
            </Text>
            <Text style={{ color: colors.textDim, fontSize: 13 }}>badges unlocked</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.card2, overflow: "hidden", width: "100%", marginTop: 14 }}>
              <View style={{ width: `${(data.unlockedCount / data.total) * 100}%`, height: "100%", backgroundColor: colors.primary }} />
            </View>
            <View style={{ flexDirection: "row", gap: 18, marginTop: 16 }}>
              <SummaryStat label="Longest streak" value={`${data.stats.longestStreak}d`} />
              <SummaryStat label="Total distance" value={`${num(data.stats.totalDistance)} km`} />
              <SummaryStat label="Best day" value={`${num(data.stats.bestSteps)}`} />
            </View>
          </Card>

          <View style={{ gap: 10 }}>
            {data.badges.map((b) => (
              <Card key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 13, opacity: b.unlocked ? 1 : 0.62 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    backgroundColor: b.unlocked ? `${TIER_COLOR[b.tier]}26` : colors.card2,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: b.unlocked ? 1.5 : 0,
                    borderColor: TIER_COLOR[b.tier],
                  }}
                >
                  <Text style={{ fontSize: 24, opacity: b.unlocked ? 1 : 0.4 }}>{b.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>{b.title}</Text>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: `${TIER_COLOR[b.tier]}22` }}>
                      <Text style={{ color: TIER_COLOR[b.tier], fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{b.tier}</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textFaint, fontSize: 12.5, marginTop: 2 }}>{b.desc}</Text>
                  {!b.unlocked && (
                    <View style={{ marginTop: 7 }}>
                      <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.card2, overflow: "hidden" }}>
                        <View style={{ width: `${b.progress * 100}%`, height: "100%", backgroundColor: TIER_COLOR[b.tier], borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 3 }}>
                        {num(b.value)} / {num(b.target)}
                      </Text>
                    </View>
                  )}
                </View>
                {b.unlocked && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Card>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{value}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 1 }}>{label}</Text>
    </View>
  );
}
