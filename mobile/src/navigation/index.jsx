import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useAuthStore } from "../store/auth";

import LoginScreen          from "../screens/auth/LoginScreen";
import AlunoInicioScreen    from "../screens/aluno/InicioScreen";
import NotasScreen          from "../screens/aluno/NotasScreen";
import HorarioScreen        from "../screens/aluno/HorarioScreen";
import FinancasScreen       from "../screens/aluno/FinancasScreen";
import ProfessorInicioScreen from "../screens/professor/InicioScreen";
import AdminDashboardScreen from "../screens/admin/DashboardScreen";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_OPTS = (label, icon) => ({
  tabBarLabel: label,
  tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size - 2, color }}>{icon}</Text>,
});

function AlunoTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: "#2563eb" }}>
      <Tab.Screen name="Início"    component={AlunoInicioScreen}  options={TAB_OPTS("Início",   "🏠")} />
      <Tab.Screen name="Notas"     component={NotasScreen}         options={TAB_OPTS("Notas",    "📊")} />
      <Tab.Screen name="Horário"   component={HorarioScreen}       options={TAB_OPTS("Horário",  "🕐")} />
      <Tab.Screen name="Finanças"  component={FinancasScreen}      options={TAB_OPTS("Finanças", "💳")} />
    </Tab.Navigator>
  );
}

function ProfessorTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: "#7c3aed" }}>
      <Tab.Screen name="Início" component={ProfessorInicioScreen} options={TAB_OPTS("Início", "🏠")} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: "#1e3a8a" }}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={TAB_OPTS("Dashboard", "📈")} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { token, user, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, []);

  const getHome = () => {
    if (!token) return "Login";
    if (user?.tipo === "aluno")     return "AlunoTabs";
    if (user?.tipo === "professor") return "ProfessorTabs";
    return "AdminTabs";
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={getHome()}>
        <Stack.Screen name="Login"        component={LoginScreen} />
        <Stack.Screen name="AlunoTabs"    component={AlunoTabs} />
        <Stack.Screen name="ProfessorTabs" component={ProfessorTabs} />
        <Stack.Screen name="AdminTabs"    component={AdminTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
