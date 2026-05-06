<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        $now = now();

        $planos = [
            [
                "codigo"       => "basico",
                "nome"         => "Básico",
                "descricao"    => "Ideal para escolas pequenas que estão a começar.",
                "preco_mensal" => 0,
                "preco_anual"  => 0,
                "max_alunos"   => 100,
                "max_admins"   => 1,
                "features"     => json_encode([
                    "Até 100 alunos",
                    "Gestão de turmas e disciplinas",
                    "Lançamento de notas e boletins",
                    "Controlo de presenças",
                    "1 administrador",
                ]),
                "destaque" => false,
                "ativo"    => true,
                "ordem"    => 1,
                "created_at" => $now, "updated_at" => $now,
            ],
            [
                "codigo"       => "standard",
                "nome"         => "Standard",
                "descricao"    => "Para escolas em crescimento que precisam de mais recursos.",
                "preco_mensal" => 15000,
                "preco_anual"  => 162000,
                "max_alunos"   => 500,
                "max_admins"   => 5,
                "features"     => json_encode([
                    "Até 500 alunos",
                    "Tudo do plano Básico",
                    "Aulas remotas e materiais",
                    "Gestão financeira (propinas e emolumentos)",
                    "Relatórios avançados",
                    "Até 5 administradores",
                ]),
                "destaque" => true,
                "ativo"    => true,
                "ordem"    => 2,
                "created_at" => $now, "updated_at" => $now,
            ],
            [
                "codigo"       => "premium",
                "nome"         => "Premium",
                "descricao"    => "Solução completa para grandes instituições de ensino.",
                "preco_mensal" => 35000,
                "preco_anual"  => 378000,
                "max_alunos"   => -1,
                "max_admins"   => -1,
                "features"     => json_encode([
                    "Alunos ilimitados",
                    "Tudo do plano Standard",
                    "Multi-turno e multi-turma",
                    "Suporte prioritário 24/7",
                    "Integrações e API",
                    "Administradores ilimitados",
                ]),
                "destaque" => false,
                "ativo"    => true,
                "ordem"    => 3,
                "created_at" => $now, "updated_at" => $now,
            ],
        ];

        foreach ($planos as $p) {
            DB::table("planos")->updateOrInsert(["codigo" => $p["codigo"]], $p);
        }

        // Backfill: criar assinatura ativa para cada escola existente
        $planosByCodigo = DB::table("planos")->get()->keyBy("codigo");
        $escolas = DB::table("tenants")->get(["id", "plano", "valor_mensal", "desconto_pct", "created_at", "ativo"]);

        foreach ($escolas as $e) {
            $plano = $planosByCodigo[$e->plano] ?? $planosByCodigo["basico"];
            $exists = DB::table("assinaturas")->where("escola_id", $e->id)->exists();
            if ($exists) continue;

            DB::table("assinaturas")->insert([
                "escola_id"        => $e->id,
                "plano_id"         => $plano->id,
                "estado"           => $e->ativo ? "ativa" : "suspensa",
                "data_inicio"      => $e->created_at ? \Illuminate\Support\Carbon::parse($e->created_at)->toDateString() : now()->toDateString(),
                "preco_aplicado"   => $e->valor_mensal !== null ? $e->valor_mensal : $plano->preco_mensal,
                "desconto_pct"     => $e->desconto_pct ?? 0,
                "ciclo"            => "mensal",
                "auto_renovar"     => true,
                "proxima_renovacao" => now()->startOfMonth()->addMonth()->toDateString(),
                "created_at"       => $now,
                "updated_at"       => $now,
            ]);
        }
    }

    public function down(): void {
        DB::table("assinaturas")->truncate();
        DB::table("planos")->truncate();
    }
};
