import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useToast } from "../../lib/toast";
import { colors, typeColor, typeIcon } from "../../lib/theme";
import { num, km, dayLabel } from "../../lib/format";
import { Card, Loading, Empty, Pill } from "../../components/ui";
import { WORKOUT_FILTERS } from "../../lib/constants";
import type { Workout } from "../../lib/types";

export default function Workouts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { push } = useToast();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const q = filter === "All" ? "" : `?type=${filter}`;
    const r = await api.get<{ workouts: Workout[] }>(`/api/workouts${q}`);
    setWorkouts(r.workouts);
  }, [filter]);

  useEffect(() => {
    load();
    const socket = getSocket();
    const refresh = () => load();
    socket.on("workout:created", refresh);
    return () => {
      socket.off("workout:created", refresh);
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  function confirmDelete(w: Workout) {
    const doDelete = async () => {
      try {
        await api.del(`/api/workouts/${w._id}`);
        push("success", "Workout deleted", w.title);
        load();
      } catch {
        push("error", "Could not delete");
      }
    };
    if (Platform.OS === "web") {
      // @ts-ignore
      if (window.confirm(`Delete "${w.title}"?`)) doDelete();
    } else {
      Alert.alert("Delete workout", `Delete "${w.title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  }

  const totalCals = workouts?.reduce((s, w) => s + w.calories, 0) || 0;
  const totalMin = workouts?.reduce((s, w) => s + w.durationMin, 0) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: 30, maxWidth: 640, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>Workouts</Text>
          <TouchableOpacity
            onPress={() => router.push("/workout-new")}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 }}
          >
            <Ionicons name="add" size={18} color="#06240f" />
            <Text style={{ color: "#06240f", fontWeight: "800" }}>Log</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: colors.textDim, fontSize: 13, marginBottom: 16 }}>
          {workouts?.length || 0} workouts · {num(totalCals)} kcal · {num(totalMin)} min
        </Text>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {WORKOUT_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.borderSoft,
                }}
              >
                <Text style={{ color: active ? "#06240f" : colors.textDim, fontWeight: "700", fontSize: 13 }}>
                  {f === "All" ? "All" : `${typeIcon[f]} ${f}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!workouts ? (
          <Loading />
        ) : workouts.length === 0 ? (
          <Card><Empty emoji="🏋️" title="No workouts here" hint="Tap Log to add your first session." /></Card>
        ) : (
          <View style={{ gap: 10 }}>
            {workouts.map((w) => (
              <Card key={w._id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 }}>
                <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: `${typeColor[w.type]}22`, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 22 }}>{typeIcon[w.type]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{w.title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    <Pill label={w.intensity} color={typeColor[w.type]} />
                    <Text style={{ color: colors.textFaint, fontSize: 12 }}>
                      {w.durationMin} min{w.distanceKm > 0 ? ` · ${km(w.distanceKm)}` : ""} · {dayLabel(w.date)}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ color: typeColor[w.type], fontWeight: "800", fontSize: 16 }}>{num(w.calories)}</Text>
                  <TouchableOpacity onPress={() => confirmDelete(w)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
