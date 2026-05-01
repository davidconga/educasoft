import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/auth";
import api from "../../services/api";

export default function AdminDashboardScreen() {
  const { user, escola, logout } = useAuthStore();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard").then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: "Alunos",      value: stats.total_alunos,      color: "#2563eb", bg: "#eff6ff" },
    { label: "Professores", value: stats.total_professores,  color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Turmas",      value: stats.total_turmas,       color: "#059669", bg: "#f0fdf4" },
    { label: "Receita Mês", value: stats.receita_mes != null ? `${stats.receita_mes} Kz` : "—", color: "#d97706", bg: "#fffbeb" },
  ] : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Olá, {user?.nome?.split(" ")[0]} 👋</Text>
          <Text style={s.school}>{escola?.nome}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />}

      <View style={s.grid}>
        {cards.map((c, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: c.bg }]}>
            <Text style={[s.statNum, { color: c.color }]}>{c.value ?? "—"}</Text>
            <Text style={s.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
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
  grid:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard:   { width: "47%", borderRadius: 16, padding: 16 },
  statNum:    { fontSize: 26, fontWeight: "800" },
  statLabel:  { fontSize: 12, color: "#64748b", marginTop: 4 },
});
