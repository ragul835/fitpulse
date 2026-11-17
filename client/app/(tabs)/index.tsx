import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../../lib/auth";
import { colors, ringColors, typeColor, typeIcon } from "../../lib/theme";
import { num, km, timeAgo, pct } from "../../lib/format";
import { Card, Loading, Avatar } from "../../components/ui";
import ActivityRings from "../../components/ActivityRings";
import BarChart from "../../components/BarChart";
import type { Dashboard } from "../../lib/types";

export default function Home() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const d = await api.get<Dashboard>("/api/dashboard");
    setData(d);
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const refresh = () => load();
    socket.on("activity:updated", refresh);
    socket.on("workout:created", refresh);
    return () => {
      socket.off("activity:updated", refresh);
      socket.off("workout:created", refresh);
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  if (!data) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading label="Loading your day…" /></View>;

  const r = data.rings;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const legend = [
    { label: "Steps", value: `${num(r.steps.value)}`, goal: `/ ${num(r.steps.goal)}`, color: ringColors.steps, frac: pct(r.steps.value, r.steps.goal) },
    { label: "Calories", value: `${num(r.calories.value)}`, goal: `/ ${num(r.calories.goal)}`, color: ringColors.calories, frac: pct(r.calories.value, r.calories.goal) },
    { label: "Active min", value: `${num(r.activeMinutes.value)}`, goal: `/ ${num(r.activeMinutes.goal)}`, color: ringColors.activeMinutes, frac: pct(r.activeMinutes.value, r.activeMinutes.goal) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: 30, maxWidth: 640, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={{ color: colors.textDim, fontSize: 14 }}>{greeting},</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>{user?.name?.split(" ")[0]} 👋</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={() => router.push("/leaderboard")} style={iconBtn}>
              <Ionicons name="podium" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/achievements")} style={iconBtn}>
              <Ionicons name="trophy" size={19} color={colors.amber} />
            </TouchableOpacity>
            <Avatar name={user?.name || "?"} color={user?.avatarColor || colors.primary} size={46} />
          </View>
        </View>

        {/* Rings card */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <ActivityRings steps={r.steps} calories={r.calories} activeMinutes={r.activeMinutes} size={150} />
            <View style={{ flex: 1, gap: 12 }}>
              {legend.map((l) => (
                <View key={l.label}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} />
                    <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: "600" }}>{l.label}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 1 }}>
                    {l.value} <Text style={{ color: colors.textFaint, fontSize: 12, fontWeight: "600" }}>{l.goal}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {/* Water progress */}
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Ionicons name="water" size={15} color="#38bdf8" />
                <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: "600" }}>Water</Text>
              </View>
              <Text style={{ color: colors.textFaint, fontSize: 12 }}>
                {((data.water?.value || 0) / 1000).toFixed(2)} / {((data.water?.goal || 2500) / 1000).toFixed(1)} L
              </Text>
            </View>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.card2, overflow: "hidden" }}>
              <View style={{ width: `${pct(data.water?.value || 0, data.water?.goal || 2500) * 100}%`, height: "100%", backgroundColor: "#38bdf8", borderRadius: 4 }} />
            </View>
          </View>
        </Card>

        {/* Quick stats row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <MiniStat icon="flame" color={colors.amber} value={`${data.streak}`} label={data.streak === 1 ? "day streak" : "day streak"} />
          <MiniStat icon="barbell" color={colors.primary} value={`${data.totalWorkouts}`} label="workouts" />
          <MiniStat icon="walk" color={colors.cyan} value={km(data.weekTotals.distanceKm)} label="this week" />
        </View>

        {/* Weekly chart */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>This week</Text>
            <Text style={{ color: colors.textFaint, fontSize: 12.5 }}>{num(data.weekTotals.steps)} steps</Text>
          </View>
          <BarChart data={data.week.map((d) => ({ label: d.label || "", value: d.steps }))} color={colors.primary} />
        </Card>

        {/* Recent workouts */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>Recent workouts</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/workouts")}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>See all</Text>
          </TouchableOpacity>
        </View>

        {data.recentWorkouts.length === 0 ? (
          <Card><Text style={{ color: colors.textFaint, textAlign: "center" }}>No workouts yet — log your first one!</Text></Card>
        ) : (
          <View style={{ gap: 10 }}>
            {data.recentWorkouts.map((w) => (
              <Card key={w._id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${typeColor[w.type]}22`, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 20 }}>{typeIcon[w.type]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14.5 }}>{w.title}</Text>
                  <Text style={{ color: colors.textFaint, fontSize: 12.5 }}>
                    {w.durationMin} min · {w.type} · {timeAgo(w.date)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: typeColor[w.type], fontWeight: "800", fontSize: 15 }}>{num(w.calories)}</Text>
                  <Text style={{ color: colors.textFaint, fontSize: 11 }}>kcal</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/workout-new")}
        activeOpacity={0.88}
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          backgroundColor: colors.primary,
          width: 58,
          height: 58,
          borderRadius: 29,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={30} color="#06240f" />
      </TouchableOpacity>
    </View>
  );
}

const iconBtn = {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

function MiniStat({ icon, color, value, label }: { icon: any; color: string; value: string; label: string }) {
  return (
    <Card style={{ flex: 1, paddingVertical: 14, alignItems: "flex-start", gap: 6 }}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 11.5 }}>{label}</Text>
    </Card>
  );
}
