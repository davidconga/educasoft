import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import api from "../../services/api";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DIAS_LABEL = { segunda: "2ª Feira", terca: "3ª Feira", quarta: "4ª Feira", quinta: "5ª Feira", sexta: "6ª Feira", sabado: "Sábado" };

export default function HorarioScreen() {
  const [horarios, setHorarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [diaAtivo, setDiaAtivo] = useState(DIAS[new Date().getDay() - 1] ?? "segunda");

  useEffect(() => {
    api.get("/portal/horario").then(r => setHorarios(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const aulas = horarios.filter(h => h.dia_semana === diaAtivo);

  return (
    <View style={s.container}>
      <Text style={[s.pageTitle, { padding: 16, paddingBottom: 8 }]}>Horário</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.diasRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {DIAS.map(d => (
          <TouchableOpacity key={d} style={[s.diaBtn, diaAtivo === d && s.diaBtnActive]} onPress={() => setDiaAtivo(d)}>
            <Text style={[s.diaBtnText, diaAtivo === d && s.diaBtnTextActive]}>{DIAS_LABEL[d]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {loading && <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />}
        {!loading && aulas.length === 0 && <Text style={s.empty}>Sem aulas neste dia.</Text>}
        {aulas.map((a, i) => (
          <View key={i} style={s.card}>
            <View style={s.horaBox}>
              <Text style={s.hora}>{a.hora_inicio?.slice(0,5)}</Text>
              <Text style={s.horaSep}>|</Text>
              <Text style={s.hora}>{a.hora_fim?.slice(0,5)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.disciplina}>{a.disciplina}</Text>
              <Text style={s.professor}>{a.professor}</Text>
              {a.sala && <Text style={s.sala}>Sala: {a.sala}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#f1f5f9" },
  pageTitle:        { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  diasRow:          { maxHeight: 52, marginBottom: 4 },
  diaBtn:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#e2e8f0" },
  diaBtnActive:     { backgroundColor: "#2563eb" },
  diaBtnText:       { fontSize: 12, fontWeight: "600", color: "#64748b" },
  diaBtnTextActive: { color: "#fff" },
  empty:            { textAlign: "center", color: "#94a3b8", marginTop: 40 },
  card:             { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", elevation: 1 },
  horaBox:          { alignItems: "center", minWidth: 52 },
  hora:             { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  horaSep:          { fontSize: 10, color: "#cbd5e1" },
  disciplina:       { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  professor:        { fontSize: 12, color: "#64748b", marginTop: 2 },
  sala:             { fontSize: 11, color: "#94a3b8", marginTop: 1 },
});
