import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useToast } from "../../lib/toast";
import { colors, radius } from "../../lib/theme";
import { num } from "../../lib/format";
import { Card, Loading, Empty, Button } from "../../components/ui";
import type { Goal } from "../../lib/types";

const METRIC_META: Record<string, { label: string; color: string; unit: string; icon: any }> = {
  steps: { label: "Steps", color: "#6366f1", unit: "steps", icon: "walk" },
  calories: { label: "Calories", color: "#f59e0b", unit: "kcal", icon: "flame" },
  workouts: { label: "Workouts", color: "#8b5cf6", unit: "sessions", icon: "barbell" },
  distance: { label: "Distance", color: "#06b6d4", unit: "km", icon: "map" },
  activeMinutes: { label: "Active minutes", color: "#ec4899", unit: "min", icon: "time" },
};
const METRICS = Object.keys(METRIC_META) as Goal["metric"][];

export default function Goals() {
  const insets = useSafeAreaInsets();
  const { push } = useToast();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get<{ goals: Goal[] }>("/api/goals");
    setGoals(r.goals);
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

  function confirmDelete(g: Goal) {
    const doDelete = async () => {
      try {
        await api.del(`/api/goals/${g._id}`);
        push("success", "Goal removed", g.title);
        load();
      } catch {
        push("error", "Could not delete");
      }
    };
    if (Platform.OS === "web") {
      // @ts-ignore
      if (window.confirm(`Delete goal "${g.title}"?`)) doDelete();
    } else {
      Alert.alert("Delete goal", `Delete "${g.title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: 30, maxWidth: 640, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>Goals</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 }}>
            <Ionicons name="add" size={18} color="#06240f" />
            <Text style={{ color: "#06240f", fontWeight: "800" }}>New</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: colors.textDim, fontSize: 13, marginBottom: 18 }}>Weekly and daily targets, tracked from your activity.</Text>

        {!goals ? (
          <Loading />
        ) : goals.length === 0 ? (
          <Card><Empty emoji="🎯" title="No goals yet" hint="Set a target to stay motivated." /></Card>
        ) : (
          <View style={{ gap: 12 }}>
            {goals.map((g) => {
              const meta = METRIC_META[g.metric];
              const frac = Math.max(0, Math.min(1, g.current / g.target));
              const done = g.current >= g.target;
              return (
                <Card key={g._id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${meta.color}22`, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{g.title}</Text>
                      <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 1 }}>{g.period === "daily" ? "Daily" : "This week"} · {meta.label}</Text>
                    </View>
                    {done && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    <TouchableOpacity onPress={() => confirmDelete(g)} hitSlop={8} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.card2, overflow: "hidden" }}>
                    <View style={{ width: `${frac * 100}%`, height: "100%", backgroundColor: done ? colors.primary : meta.color, borderRadius: 5 }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 7 }}>
                    <Text style={{ color: done ? colors.primary : meta.color, fontWeight: "800", fontSize: 13 }}>
                      {num(g.current)} / {num(g.target)} {meta.unit}
                    </Text>
                    <Text style={{ color: colors.textFaint, fontSize: 13 }}>{Math.round(frac * 100)}%</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AddGoalModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          load();
        }}
      />
    </View>
  );
}

function AddGoalModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<Goal["metric"]>("steps");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly">("weekly");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !Number(target)) {
      push("error", "Fill in the goal", "Add a title and a numeric target.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/goals", { title: title.trim(), metric, target: Number(target), period });
      push("success", "Goal created 🎯", title.trim());
      setTitle("");
      setTarget("");
      onSaved();
    } catch (e) {
      push("error", "Could not save", e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: colors.bgSoft, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, maxWidth: 560, width: "100%", alignSelf: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>New goal</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.textDim} /></TouchableOpacity>
          </View>

          <Text style={gLabel}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Walk 80k steps" placeholderTextColor={colors.textFaint} style={gInput} />

          <Text style={[gLabel, { marginTop: 14 }]}>Metric</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {METRICS.map((mm) => {
              const meta = METRIC_META[mm];
              const active = metric === mm;
              return (
                <TouchableOpacity
                  key={mm}
                  onPress={() => setMetric(mm)}
                  style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: active ? `${meta.color}26` : colors.card, borderWidth: 1, borderColor: active ? meta.color : colors.borderSoft }}
                >
                  <Ionicons name={meta.icon} size={15} color={active ? meta.color : colors.textFaint} />
                  <Text style={{ color: active ? colors.text : colors.textDim, fontWeight: "700", fontSize: 12.5 }}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={gLabel}>Target ({METRIC_META[metric].unit})</Text>
              <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textFaint} style={gInput} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={gLabel}>Period</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["daily", "weekly"] as const).map((p) => (
                  <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={{ flex: 1, paddingVertical: 11, borderRadius: radius.sm, alignItems: "center", backgroundColor: period === p ? colors.primary : colors.card, borderWidth: 1, borderColor: period === p ? colors.primary : colors.borderSoft }}>
                    <Text style={{ color: period === p ? "#06240f" : colors.textDim, fontWeight: "700", fontSize: 12.5 }}>{p === "daily" ? "Daily" : "Weekly"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Button title="Create goal" onPress={save} loading={busy} style={{ marginTop: 22 }} />
        </View>
      </View>
    </Modal>
  );
}

const gLabel = { color: colors.textDim, fontSize: 12.5, fontWeight: "600" as const, marginBottom: 7 };
const gInput = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: colors.text,
  fontSize: 15,
  ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
};
