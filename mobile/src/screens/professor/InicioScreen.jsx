import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/auth";
import api from "../../services/api";

export default function ProfessorInicioScreen() {
  const { user, escola, logout } = useAuthStore();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/professor/inicio").then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Olá, Prof. {user?.nome?.split(" ")[0]} 👋</Text>
          <Text style={s.school}>{escola?.nome}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />}

      {stats && (
        <View style={{ gap: 10 }}>
          <View style={[s.row, { gap: 10 }]}>
            <View style={[s.statCard, { backgroundColor: "#eff6ff" }]}>
              <Text style={[s.statNum, { color: "#2563eb" }]}>{stats.total_turmas ?? "—"}</Text>
              <Text style={s.statLabel}>Turmas</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: "#f0fdf4" }]}>
              <Text style={[s.statNum, { color: "#059669" }]}>{stats.total_alunos ?? "—"}</Text>
              <Text style={s.statLabel}>Alunos</Text>
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Aulas hoje</Text>
            <Text style={s.cardValue}>{stats.aulas_hoje ?? 0}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#f1f5f9" },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting:   { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  school:     { fontSize: 13, color: "#64748b", marginTop: 2 },
  logoutBtn:  { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fee2e2", borderRadius: 10 },
  logoutText: { color: "#dc2626", fontWeight: "600", fontSize: 13 },
  row:        { flexDirection: "row" },
  statCard:   { flex: 1, borderRadius: 14, padding: 16, alignItems: "center" },
  statNum:    { fontSize: 28, fontWeight: "800" },
  statLabel:  { fontSize: 12, color: "#64748b", marginTop: 4 },
  card:       { backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1 },
  cardLabel:  { fontSize: 12, color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" },
  cardValue:  { fontSize: 22, fontWeight: "800", color: "#1e293b", marginTop: 4 },
});
