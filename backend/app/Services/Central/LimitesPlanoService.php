<?php
namespace App\Services\Central;

use App\Models\Central\Escola;
use Illuminate\Support\Facades\DB;

/**
 * Verifica se o tenant ainda pode criar alunos / administradores conforme
 * os limites do plano em vigor (max_alunos / max_admins).
 *
 * -1 em qualquer max significa "ilimitado".
 *
 * Usa a connection "tenant" para contar (deve ser chamado dentro de
 * contexto tenant inicializado).
 */
class LimitesPlanoService {
    public function __construct(private PlanoTenantResolver $resolver = new PlanoTenantResolver()) {}

    /**
     * @return array{pode:bool, atual:int, max:int, restantes:?int, ilimitado:bool, mensagem:?string, plano:?string}
     */
    public function alunos(Escola $escola): array {
        $info = $this->resolver->paraEscola($escola);
        $max  = (int) ($info["max_alunos"] ?? 0);
        $atual = (int) DB::connection("tenant")->table("users")->where("tipo", "aluno")->count();
        return $this->montar($atual, $max, $info["nome"] ?? null, "alunos");
    }

    /**
     * @return array{pode:bool, atual:int, max:int, restantes:?int, ilimitado:bool, mensagem:?string, plano:?string}
     */
    public function admins(Escola $escola): array {
        $info = $this->resolver->paraEscola($escola);
        $max  = (int) ($info["max_admins"] ?? 0);
        // "Admins" no plano = todos os utilizadores não-aluno e não-professor (staff de gestão)
        $atual = (int) DB::connection("tenant")->table("users")
            ->whereNotIn("tipo", ["aluno", "professor"])
            ->count();
        return $this->montar($atual, $max, $info["nome"] ?? null, "administradores");
    }

    private function montar(int $atual, int $max, ?string $planoNome, string $tipoLabel): array {
        $ilimitado = $max < 0;
        $pode = $ilimitado || $atual < $max;
        return [
            "pode"      => $pode,
            "atual"     => $atual,
            "max"       => $max,
            "restantes" => $ilimitado ? null : max(0, $max - $atual),
            "ilimitado" => $ilimitado,
            "plano"     => $planoNome,
            "mensagem"  => $pode ? null : sprintf(
                "Limite de %s atingido (%d/%d). O plano %s não permite mais. Faça upgrade para adicionar mais.",
                $tipoLabel, $atual, $max, $planoNome ?? "actual"
            ),
        ];
    }
}
