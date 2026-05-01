import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import api from "../../services/api";

export default function NotasScreen() {
  const [notas,   setNotas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portal/notas").then(r => setNotas(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cor = (n) => {
    if (n == null) return "#94a3b8";
    if (n >= 14)   return "#059669";
    if (n >= 10)   return "#d97706";
    return "#dc2626";
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={s.pageTitle}>Minhas Notas</Text>
      {loading && <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />}
      {!loading && notas.length === 0 && (
        <Text style={s.empty}>Sem notas registadas.</Text>
      )}
      {notas.map((n, i) => (
        <View key={i} style={s.card}>
          <View style={{ flex: 1 }}>
            <Text style={s.disciplina}>{n.disciplina}</Text>
            <Text style={s.periodo}>{n.periodo ?? "—"}</Text>
          </View>
          <View style={[s.notaBadge, { backgroundColor: cor(n.nota) + "22" }]}>
            <Text style={[s.notaText, { color: cor(n.nota) }]}>{n.nota ?? "—"}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#f1f5f9" },
  pageTitle:   { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  empty:       { textAlign: "center", color: "#94a3b8", marginTop: 40 },
  card:        { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", elevation: 1 },
  disciplina:  { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  periodo:     { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  notaBadge:   { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notaText:    { fontSize: 18, fontWeight: "800" },
});
