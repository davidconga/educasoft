import { Navigate } from "react-router-dom";
import { usePlano } from "../hooks/usePlano";

/**
 * Wrapper de rota — bloqueia acesso a uma página se o plano activo do tenant
 * não inclui a feature dada. Redirecciona para /upgrade.
 *
 * Uso:
 *   <Route path="/aulas-remotas" element={
 *     <RequiresFeature feature="aulas_remotas">
 *       <ProtectedRoute><Layout><AulasRemotas/></Layout></ProtectedRoute>
 *     </RequiresFeature>
 *   } />
 */
export default function RequiresFeature({ feature, children }) {
  const { plano, hasFeature } = usePlano();

  // ainda a carregar o plano — não decidir
  if (!plano) return children;

  if (!hasFeature(feature)) {
    return <Navigate to={`/upgrade?feature=${encodeURIComponent(feature)}`} replace />;
  }
  return children;
}
