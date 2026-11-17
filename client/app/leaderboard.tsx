import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { colors } from "../lib/theme";
import { num } from "../lib/format";
import { Card, Loading, Avatar } from "../components/ui";
import type { LeaderRow } from "../lib/types";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const r = await api.get<{ rows: LeaderRow[]; myRank: number | null }>("/api/leaderboard");
    setRows(r.rows);
    setMyRank(r.myRank);
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    const refresh = () => load();
    socket.on("activity:updated", refresh);
    return () => {
      socket.off("activity:updated", refresh);
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Leaderboard</Text>
          <Text style={{ color: colors.textFaint, fontSize: 12 }}>Steps this week{myRank ? ` · you're #${myRank}` : ""}</Text>
        </View>
      </View>

      {!rows ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={{ gap: 9 }}>
            {rows.map((r) => (
              <Card
                key={r.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderColor: r.isMe ? colors.primary : colors.borderSoft,
                  borderWidth: r.isMe ? 1.5 : 1,
                  backgroundColor: r.isMe ? colors.primarySoft : colors.card,
                }}
              >
                <View style={{ width: 30, alignItems: "center" }}>
                  {MEDAL[r.rank] ? (
                    <Text style={{ fontSize: 22 }}>{MEDAL[r.rank]}</Text>
                  ) : (
                    <Text style={{ color: colors.textFaint, fontWeight: "800", fontSize: 15 }}>{r.rank}</Text>
                  )}
                </View>
                <Avatar name={r.name} color={r.avatarColor} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                    {r.name}
                    {r.isMe ? <Text style={{ color: colors.primary, fontWeight: "800" }}>  · You</Text> : null}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 12 }}>{num(r.activeMinutes)} active min</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{num(r.steps)}</Text>
                  <Text style={{ color: colors.textFaint, fontSize: 11 }}>steps</Text>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
