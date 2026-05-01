import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import axios from "axios";
import { useAuthStore } from "../../store/auth";

const TIPOS = [
  { key: "aluno",          label: "Aluno",          tiposValidos: ["aluno"],                                              redirect: "AlunoTabs" },
  { key: "professor",      label: "Professor",       tiposValidos: ["professor"],                                         redirect: "ProfessorTabs" },
  { key: "administrativo", label: "Administrativo",  tiposValidos: ["admin","secretaria","director","tesouraria","coordenador"], redirect: "AdminTabs" },
];

export default function LoginScreen() {
  const [tipo,     setTipo]     = useState("aluno");
  const [codigo,   setCodigo]   = useState("");
  const [ident,    setIdent]    = useState("");
  const [senha,    setSenha]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { setAuth } = useAuthStore();

  const tipoConfig = TIPOS.find(t => t.key === tipo);

  const handleLogin = async () => {
    if (!codigo || !ident || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `https://educa.okulandisa.com/api/tenant/auth/login?tenant=${codigo}`,
        { identifier: ident, password: senha }
      );
      if (!tipoConfig.tiposValidos.includes(data.user?.tipo)) {
        Alert.alert("Erro", `Esta conta não pertence ao perfil "${tipoConfig.label}".`);
        return;
      }
      await setAuth(data.token, data.user, data.escola, codigo);
    } catch (err) {
      Alert.alert("Erro", err.response?.data?.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.card}>

          {/* Logo / Título */}
          <View style={s.header}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>E</Text>
            </View>
            <Text style={s.title}>Educa</Text>
            <Text style={s.subtitle}>Sistema de Gestão Escolar</Text>
          </View>

          {/* Selector de tipo */}
          <View style={s.tipoRow}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.tipoBtn, tipo === t.key && s.tipoBtnActive]}
                onPress={() => { setTipo(t.key); setIdent(""); }}
              >
                <Text style={[s.tipoBtnText, tipo === t.key && s.tipoBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Campos */}
          <View style={s.form}>
            <Text style={s.label}>Código da Escola</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: minhaescola"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="none"
            />

            <Text style={s.label}>{tipo === "aluno" ? "Nº de Matrícula" : "Email"}</Text>
            <TextInput
              style={s.input}
              placeholder={tipo === "aluno" ? "Ex: 076556" : "email@escola.ao"}
              value={ident}
              onChangeText={setIdent}
              autoCapitalize="none"
              keyboardType={tipo === "aluno" ? "default" : "email-address"}
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />

            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Entrar como {tipoConfig.label}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:       { flexGrow: 1, backgroundColor: "#1e40af", justifyContent: "center", padding: 20 },
  card:            { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" },
  header:          { backgroundColor: "#1e3a8a", alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
  logoBox:         { width: 60, height: 60, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  logoText:        { fontSize: 28, fontWeight: "bold", color: "#fff" },
  title:           { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subtitle:        { fontSize: 12, color: "#bfdbfe", marginTop: 4 },
  tipoRow:         { flexDirection: "row", margin: 16, gap: 8 },
  tipoBtn:         { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: "#e2e8f0", alignItems: "center" },
  tipoBtnActive:   { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  tipoBtnText:     { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  tipoBtnTextActive: { color: "#2563eb" },
  form:            { paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  label:           { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 10 },
  input:           { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, backgroundColor: "#f8fafc" },
  btn:             { backgroundColor: "#1d4ed8", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  btnText:         { color: "#fff", fontWeight: "700", fontSize: 14 },
});
