import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { colors, radius } from "../../lib/theme";
import { Card, Button, Avatar } from "../../components/ui";
import LineChart from "../../components/LineChart";
import type { User, WeightSummary } from "../../lib/types";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { push } = useToast();
  const [editProfile, setEditProfile] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const [logWeight, setLogWeight] = useState(false);
  const [weight, setWeight] = useState<WeightSummary | null>(null);

  async function loadWeight() {
    try {
      setWeight(await api.get<WeightSummary>("/api/weight"));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadWeight();
    const socket = getSocket();
    const refresh = () => loadWeight();
    socket.on("weight:updated", refresh);
    return () => {
      socket.off("weight:updated", refresh);
    };
  }, []);

  if (!user) return null;

  const bmi = user.heightCm ? user.weightKg / Math.pow(user.heightCm / 100, 2) : 0;
  const bmiLabel = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "High";
  const bmiColor = bmi < 18.5 ? colors.cyan : bmi < 25 ? colors.primary : bmi < 30 ? colors.amber : colors.red;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900", marginBottom: 18 }}>Profile</Text>

        {/* Identity */}
        <Card style={{ alignItems: "center", marginBottom: 14 }}>
          <Avatar name={user.name} color={user.avatarColor} size={72} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 12 }}>{user.name}</Text>
          <Text style={{ color: colors.textDim, fontSize: 13.5, marginTop: 2 }}>{user.email}</Text>
        </Card>

        {/* Body stats */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>Body stats</Text>
            <TouchableOpacity onPress={() => setEditProfile(true)}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Edit</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Metric label="Age" value={`${user.age}`} />
            <Metric label="Height" value={`${user.heightCm} cm`} />
            <Metric label="Weight" value={`${user.weightKg} kg`} />
            <Metric label="Goal weight" value={`${user.goalWeightKg} kg`} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
            <Text style={{ color: colors.textDim, fontSize: 13.5 }}>Body Mass Index</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>{bmi.toFixed(1)}</Text>
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: `${bmiColor}22` }}>
                <Text style={{ color: bmiColor, fontSize: 11.5, fontWeight: "700" }}>{bmiLabel}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Weight trend */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>Weight trend</Text>
            <TouchableOpacity onPress={() => setLogWeight(true)}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Log weight</Text></TouchableOpacity>
          </View>
          {weight && weight.entries.length > 1 ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
                <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>{weight.latest.toFixed(1)} kg</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
                  <Ionicons name={weight.change <= 0 ? "arrow-down" : "arrow-up"} size={14} color={weight.change <= 0 ? colors.primary : colors.amber} />
                  <Text style={{ color: weight.change <= 0 ? colors.primary : colors.amber, fontWeight: "700", fontSize: 13 }}>
                    {Math.abs(weight.change).toFixed(1)} kg
                  </Text>
                </View>
              </View>
              <LineChart values={weight.entries.map((e) => e.weightKg)} goal={weight.goalWeightKg} color={colors.primary} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: colors.textFaint, fontSize: 11 }}>{weight.entries.length} entries</Text>
                <Text style={{ color: colors.textFaint, fontSize: 11 }}>- - goal {weight.goalWeightKg} kg</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: colors.textFaint, fontSize: 13, paddingVertical: 10 }}>Log your weight to see a trend over time.</Text>
          )}
        </Card>

        {/* More: Achievements + Leaderboard */}
        <Card style={{ marginBottom: 14, paddingVertical: 4 }}>
          <MenuRow icon="trophy" color={colors.amber} label="Achievements" onPress={() => router.push("/achievements")} />
          <MenuRow icon="podium" color={colors.violet} label="Leaderboard" onPress={() => router.push("/leaderboard")} last />
        </Card>

        {/* Daily targets */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>Daily targets</Text>
            <TouchableOpacity onPress={() => setEditGoals(true)}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Edit</Text></TouchableOpacity>
          </View>
          <TargetRow icon="walk" color="#6366f1" label="Steps" value={user.dailyStepGoal.toLocaleString()} />
          <TargetRow icon="flame" color="#f59e0b" label="Calories burned" value={`${user.dailyCalorieGoal} kcal`} />
          <TargetRow icon="time" color="#06b6d4" label="Active minutes" value={`${user.dailyActiveMinGoal} min`} />
          <TargetRow icon="water" color="#38bdf8" label="Water" value={`${((user.dailyWaterMl || 2500) / 1000).toFixed(1)} L`} last />
        </Card>

        <Button title="Sign out" variant="danger" onPress={logout} icon={<Ionicons name="log-out-outline" size={18} color="#fca5a5" />} />

        <Text style={{ color: colors.textFaint, fontSize: 12, textAlign: "center", marginTop: 20 }}>
          FitPulse · built by We Raise Tech
        </Text>
      </ScrollView>

      <EditProfileModal
        visible={editProfile}
        user={user}
        onClose={() => setEditProfile(false)}
        fields={[
          { key: "name", label: "Name", numeric: false },
          { key: "age", label: "Age", numeric: true },
          { key: "heightCm", label: "Height (cm)", numeric: true },
          { key: "weightKg", label: "Weight (kg)", numeric: true },
          { key: "goalWeightKg", label: "Goal weight (kg)", numeric: true },
        ]}
        title="Edit body stats"
        onSaved={(u) => {
          updateUser(u);
          setEditProfile(false);
          push("success", "Profile updated");
        }}
      />
      <EditProfileModal
        visible={editGoals}
        user={user}
        onClose={() => setEditGoals(false)}
        fields={[
          { key: "dailyStepGoal", label: "Daily steps", numeric: true },
          { key: "dailyCalorieGoal", label: "Daily calories", numeric: true },
          { key: "dailyActiveMinGoal", label: "Daily active minutes", numeric: true },
          { key: "dailyWaterMl", label: "Daily water (ml)", numeric: true },
        ]}
        title="Edit daily targets"
        onSaved={(u) => {
          updateUser(u);
          setEditGoals(false);
          push("success", "Targets updated");
        }}
      />
      <LogWeightModal
        visible={logWeight}
        current={weight?.latest || user.weightKg}
        onClose={() => setLogWeight(false)}
        onSaved={() => {
          setLogWeight(false);
          loadWeight();
          push("success", "Weight logged");
        }}
      />
    </View>
  );
}

function MenuRow({ icon, color, label, onPress, last }: { icon: any; color: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.borderSoft }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: "600", flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

function LogWeightModal({ visible, current, onClose, onSaved }: { visible: boolean; current: number; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const w = Number(value || current);
    if (!w || w < 20) {
      push("error", "Enter a valid weight");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/weight", { weightKg: w });
      setValue("");
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
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Log weight</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.textDim} /></TouchableOpacity>
          </View>
          <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: "600", marginBottom: 7 }}>Today's weight (kg)</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder={current ? current.toFixed(1) : "70.0"}
            placeholderTextColor={colors.textFaint}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.sm,
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 20,
              fontWeight: "700",
              textAlign: "center",
              ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
            }}
          />
          <Button title="Save" onPress={save} loading={busy} style={{ marginTop: 18 }} />
        </View>
      </View>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "50%", marginBottom: 12 }}>
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function TargetRow({ icon, color, label, value, last }: { icon: any; color: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.borderSoft }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={{ color: colors.textDim, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{value}</Text>
    </View>
  );
}

interface FieldSpec {
  key: keyof User;
  label: string;
  numeric: boolean;
}

function EditProfileModal({
  visible,
  user,
  fields,
  title,
  onClose,
  onSaved,
}: {
  visible: boolean;
  user: User;
  fields: FieldSpec[];
  title: string;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Initialise form when opening.
  const current = (k: keyof User) => (form[k] !== undefined ? form[k] : String(user[k] ?? ""));

  async function save() {
    setBusy(true);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = current(f.key);
      payload[f.key] = f.numeric ? Number(raw) : raw;
    }
    try {
      const r = await api.patch<{ user: User }>("/api/auth/me", payload);
      onSaved(r.user);
      setForm({});
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
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.textDim} /></TouchableOpacity>
          </View>
          {fields.map((f) => (
            <View key={String(f.key)} style={{ marginBottom: 14 }}>
              <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: "600", marginBottom: 7 }}>{f.label}</Text>
              <TextInput
                value={current(f.key)}
                onChangeText={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                keyboardType={f.numeric ? "numeric" : "default"}
                placeholderTextColor={colors.textFaint}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 15,
                  ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
                }}
              />
            </View>
          ))}
          <Button title="Save changes" onPress={save} loading={busy} style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}
