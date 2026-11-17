import { useState, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/toast";
import { colors, radius, typeColor, typeIcon } from "../lib/theme";
import { Button } from "../components/ui";
import { WORKOUT_TYPES, INTENSITIES, CAL_PER_MIN, DISTANCE_TYPES } from "../lib/constants";
import type { WorkoutType } from "../lib/types";

export default function WorkoutNew() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { push } = useToast();

  const [type, setType] = useState<WorkoutType>("Run");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState<(typeof INTENSITIES)[number]>("Moderate");
  const [busy, setBusy] = useState(false);

  // Suggested calories from duration + type (user can override).
  const suggestedCals = useMemo(() => Math.round((Number(duration) || 0) * CAL_PER_MIN[type]), [duration, type]);
  const effectiveCals = calories === "" ? suggestedCals : Number(calories);
  const showDistance = DISTANCE_TYPES.includes(type);

  async function save() {
    if (!title.trim()) {
      push("error", "Add a title", "Give your workout a name.");
      return;
    }
    if (!Number(duration)) {
      push("error", "Add a duration", "Minutes must be greater than 0.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/workouts", {
        type,
        title: title.trim(),
        durationMin: Number(duration),
        calories: effectiveCals,
        distanceKm: showDistance ? Number(distance) || 0 : 0,
        intensity,
      });
      push("success", "Workout logged 🎉", `${title.trim()} · ${effectiveCals} kcal`);
      router.back();
    } catch (e) {
      push("error", "Could not save", e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Log workout</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color={colors.textDim} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 560, width: "100%", alignSelf: "center" }}>
        {/* Type picker */}
        <Text style={label}>Activity type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {WORKOUT_TYPES.map((t) => {
            const active = type === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: active ? `${typeColor[t]}26` : colors.card,
                  borderWidth: 1.5,
                  borderColor: active ? typeColor[t] : colors.borderSoft,
                }}
              >
                <Text style={{ fontSize: 16 }}>{typeIcon[t]}</Text>
                <Text style={{ color: active ? colors.text : colors.textDim, fontWeight: "700", fontSize: 13.5 }}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={`e.g. Morning ${type}`}
          placeholderTextColor={colors.textFaint}
          style={input}
        />

        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={label}>Duration (min)</Text>
            <TextInput value={duration} onChangeText={setDuration} keyboardType="numeric" style={input} placeholderTextColor={colors.textFaint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={label}>Calories</Text>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              placeholder={`${suggestedCals}`}
              placeholderTextColor={colors.textFaint}
              style={input}
            />
            <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 4 }}>Auto-estimated: {suggestedCals} kcal</Text>
          </View>
        </View>

        {showDistance && (
          <View style={{ marginTop: 14 }}>
            <Text style={label}>Distance (km)</Text>
            <TextInput value={distance} onChangeText={setDistance} keyboardType="numeric" placeholder="0.0" placeholderTextColor={colors.textFaint} style={input} />
          </View>
        )}

        <Text style={[label, { marginTop: 18 }]}>Intensity</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {INTENSITIES.map((i) => {
            const active = intensity === i;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setIntensity(i)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: radius.sm,
                  alignItems: "center",
                  backgroundColor: active ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.borderSoft,
                }}
              >
                <Text style={{ color: active ? "#06240f" : colors.textDim, fontWeight: "700" }}>{i}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="Save workout" onPress={save} loading={busy} style={{ marginTop: 26 }} />
      </ScrollView>
    </View>
  );
}

const label = { color: colors.textDim, fontSize: 12.5, fontWeight: "600" as const, marginBottom: 7 };
const input = {
  backgroundColor: colors.bgSoft,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: colors.text,
  fontSize: 15,
  ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
};
