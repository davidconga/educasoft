import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import api from "../../services/api";

const COR_ESTADO = { pago: "#059669", pendente: "#d97706", cancelado: "#dc2626" };
const LABEL_ESTADO = { pago: "Pago", pendente: "Pendente", cancelado: "Cancelado" };

export default function FinancasScreen() {
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portal/financas").then(r => setDados(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.pageTitle}>Finanças</Text>

      {loading && <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />}

      {dados && (
        <>
          <View style={[s.card, { flexDirection: "row", gap: 10 }]}>
            <View style={[s.statBox, { backgroundColor: "#dcfce7" }]}>
              <Text style={[s.statValue, { color: "#059669" }]}>{dados.total_pago ?? 0} Kz</Text>
              <Text style={s.statLabel}>Total Pago</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: "#fef3c7" }]}>
              <Text style={[s.statValue, { color: "#d97706" }]}>{dados.total_pendente ?? 0} Kz</Text>
              <Text style={s.statLabel}>Em Dívida</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Histórico de Pagamentos</Text>
          {(dados.pagamentos ?? []).map((p, i) => (
            <View key={i} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.descricao}>{p.descricao}</Text>
                <Text style={s.data}>{p.data}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={s.valor}>{p.valor} Kz</Text>
                <View style={[s.estadoBadge, { backgroundColor: (COR_ESTADO[p.estado] ?? "#94a3b8") + "22" }]}>
                  <Text style={[s.estadoText, { color: COR_ESTADO[p.estado] ?? "#94a3b8" }]}>
                    {LABEL_ESTADO[p.estado] ?? p.estado}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {(dados.pagamentos ?? []).length === 0 && (
            <Text style={s.empty}>Sem pagamentos registados.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#f1f5f9" },
  pageTitle:    { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#475569", marginTop: 4 },
  empty:        { textAlign: "center", color: "#94a3b8", marginTop: 20 },
  card:         { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", elevation: 1 },
  statBox:      { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  statValue:    { fontSize: 18, fontWeight: "800" },
  statLabel:    { fontSize: 11, color: "#64748b", marginTop: 2 },
  descricao:    { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  data:         { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  valor:        { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  estadoBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  estadoText:   { fontSize: 11, fontWeight: "600" },
});
