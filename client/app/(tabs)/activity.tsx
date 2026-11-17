import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { colors, radius } from "../../lib/theme";
import { num, km, pct } from "../../lib/format";
import { Card, Loading, SectionTitle } from "../../components/ui";
import BarChart from "../../components/BarChart";
import type { DayPoint } from "../../lib/types";

type Metric = "steps" | "calories" | "activeMinutes";
const METRICS: { key: Metric; label: string; color: string; unit: string }[] = [
  { key: "steps", label: "Steps", color: "#6366f1", unit: "" },
  { key: "calories", label: "Calories", color: "#f59e0b", unit: "kcal" },
  { key: "activeMinutes", label: "Active min", color: "#06b6d4", unit: "min" },
];

export default function Activity() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { push } = useToast();
  const [series, setSeries] = useState<DayPoint[] | null>(null);
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<Metric>("steps");
  const [refreshing, setRefreshing] = useState(false);
  const [stepInput, setStepInput] = useState("1000");

  const load = useCallback(async () => {
    const r = await api.get<{ series: DayPoint[] }>(`/api/activity/range?days=${days}`);
    setSeries(r.series);
  }, [days]);

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

  async function addSteps() {
    const amount = Number(stepInput) || 1000;
    try {
      await api.post("/api/activity/add-steps", { amount });
      push("success", "Steps added", `+${num(amount)} steps today`);
      load();
    } catch {
      push("error", "Could not add steps");
    }
  }

  async function addWater(amount: number) {
    try {
      await api.post("/api/activity/add-water", { amount });
      load();
    } catch {
      push("error", "Could not update water");
    }
  }

  if (!series) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>;

  const today = series[series.length - 1];
  const m = METRICS.find((x) => x.key === metric)!;
  const chartData = series.map((d) => ({
    label: d.day.slice(8),
    value: (d as any)[metric] as number,
  }));
  const total = series.reduce((s, d) => s + ((d as any)[metric] as number), 0);
  const avg = Math.round(total / series.length);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: 30, maxWidth: 640, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900", marginBottom: 16 }}>Activity</Text>

        {/* Today summary */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={{ color: colors.textDim, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>Today</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TodayStat label="Steps" value={num(today.steps)} color="#6366f1" />
            <TodayStat label="Calories" value={num(today.calories)} color="#f59e0b" />
            <TodayStat label="Active" value={`${num(today.activeMinutes)}m`} color="#06b6d4" />
            <TodayStat label="Distance" value={km(today.distanceKm)} color="#8b5cf6" />
          </View>
        </Card>

        {/* Quick add steps */}
        <Card style={{ marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="walk" size={22} color={colors.primary} />
          <Text style={{ color: colors.textDim, fontSize: 13.5, flex: 1 }}>Quick log steps</Text>
          <TextInput
            value={stepInput}
            onChangeText={setStepInput}
            keyboardType="numeric"
            style={{
              width: 80,
              backgroundColor: colors.bgSoft,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: colors.text,
              textAlign: "center",
              ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
            }}
          />
          <TouchableOpacity onPress={addSteps} style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 }}>
            <Text style={{ color: "#06240f", fontWeight: "800" }}>Add</Text>
          </TouchableOpacity>
        </Card>

        {/* Water intake */}
        {(() => {
          const goal = user?.dailyWaterMl || 2500;
          const value = today.waterMl || 0;
          const glasses = Math.round(goal / 250);
          const filled = Math.floor(value / 250);
          return (
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="water" size={20} color="#38bdf8" />
                  <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>Water</Text>
                </View>
                <Text style={{ color: colors.textDim, fontSize: 13 }}>
                  {(value / 1000).toFixed(2)} / {(goal / 1000).toFixed(1)} L
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {Array.from({ length: glasses }).map((_, i) => (
                  <Ionicons key={i} name={i < filled ? "water" : "water-outline"} size={22} color={i < filled ? "#38bdf8" : colors.textFaint} />
                ))}
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.card2, overflow: "hidden", marginBottom: 12 }}>
                <View style={{ width: `${pct(value, goal) * 100}%`, height: "100%", backgroundColor: "#38bdf8", borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={() => addWater(250)} style={waterBtn}>
                  <Text style={waterBtnText}>+250 ml</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => addWater(500)} style={waterBtn}>
                  <Text style={waterBtnText}>+500 ml</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => addWater(-250)} style={[waterBtn, { flex: 0, paddingHorizontal: 16 }]}>
                  <Ionicons name="remove" size={18} color={colors.textDim} />
                </TouchableOpacity>
              </View>
            </Card>
          );
        })()}

        {/* Range + metric selectors */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {METRICS.map((mm) => (
              <TouchableOpacity
                key={mm.key}
                onPress={() => setMetric(mm.key)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: metric === mm.key ? `${mm.color}26` : colors.card,
                  borderWidth: 1,
                  borderColor: metric === mm.key ? mm.color : colors.borderSoft,
                }}
              >
                <Text style={{ color: metric === mm.key ? mm.color : colors.textFaint, fontWeight: "700", fontSize: 12 }}>{mm.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[7, 30].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDays(d)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: days === d ? colors.card2 : colors.card,
                  borderWidth: 1,
                  borderColor: days === d ? colors.border : colors.borderSoft,
                }}
              >
                <Text style={{ color: days === d ? colors.text : colors.textFaint, fontWeight: "700", fontSize: 12 }}>{d}d</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Card>
          <SectionTitle right={<Text style={{ color: colors.textFaint, fontSize: 12 }}>avg {num(avg)} {m.unit}</Text>}>
            {m.label} · last {days}d
          </SectionTitle>
          <BarChart data={days > 10 ? chartData.filter((_, i) => i % 3 === 0 || i === chartData.length - 1) : chartData} color={m.color} height={170} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
            <Text style={{ color: colors.textDim, fontSize: 13 }}>Total</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>{num(total)} {m.unit}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const waterBtn = {
  flex: 1,
  backgroundColor: "rgba(56,189,248,0.14)",
  paddingVertical: 11,
  borderRadius: radius.sm,
  alignItems: "center" as const,
};
const waterBtnText = { color: "#38bdf8", fontWeight: "700" as const, fontSize: 13.5 };

function TodayStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color, fontSize: 18, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
