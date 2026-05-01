import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/auth";
import api from "../../services/api";

export default function InicioScreen() {
  const { user, escola, logout } = useAuthStore();
  const [dashboard, setDashboard] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.get("/dashboard/aluno").then(r => setDashboard(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

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

      {dashboard && (
        <View style={{ gap: 12 }}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Nº de Matrícula</Text>
            <Text style={s.cardValue}>{user?.numero_matricula ?? "—"}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Turma</Text>
            <Text style={s.cardValue}>{dashboard.turma ?? "—"}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Propinas em dívida</Text>
            <Text style={[s.cardValue, { color: "#dc2626" }]}>
              {dashboard.propinas_devidas != null ? `${dashboard.propinas_devidas} Kz` : "—"}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#f1f5f9" },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  greeting:    { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  school:      { fontSize: 13, color: "#64748b", marginTop: 2 },
  logoutBtn:   { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fee2e2", borderRadius: 10 },
  logoutText:  { color: "#dc2626", fontWeight: "600", fontSize: 13 },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardLabel:   { fontSize: 12, color: "#94a3b8", marginBottom: 4, fontWeight: "600", textTransform: "uppercase" },
  cardValue:   { fontSize: 18, fontWeight: "700", color: "#1e293b" },
});
