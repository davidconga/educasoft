<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable("meses")) {
            Schema::create("meses", function (Blueprint $t) {
                $t->unsignedTinyInteger("id")->primary();        // 1..12 (estável)
                $t->string("nome", 20);                          // "Janeiro"
                $t->string("abreviatura", 5);                    // "Jan"
                $t->unsignedTinyInteger("ordem");                // 1..12 (idem id por agora)
                $t->timestamps();
            });
        }

        // Seed dos 12 meses (idempotente — só insere se não existir)
        $meses = [
            [1,  "Janeiro",   "Jan"],
            [2,  "Fevereiro", "Fev"],
            [3,  "Março",     "Mar"],
            [4,  "Abril",     "Abr"],
            [5,  "Maio",      "Mai"],
            [6,  "Junho",     "Jun"],
            [7,  "Julho",     "Jul"],
            [8,  "Agosto",    "Ago"],
            [9,  "Setembro",  "Set"],
            [10, "Outubro",   "Out"],
            [11, "Novembro",  "Nov"],
            [12, "Dezembro",  "Dez"],
        ];
        foreach ($meses as [$id, $nome, $abrev]) {
            DB::table("meses")->updateOrInsert(
                ["id" => $id],
                ["nome" => $nome, "abreviatura" => $abrev, "ordem" => $id, "created_at" => now(), "updated_at" => now()]
            );
        }
    }

    public function down(): void {
        Schema::dropIfExists("meses");
    }
};
