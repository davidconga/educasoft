<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("lembretes_pagamento", function (Blueprint $t) {
            if (!Schema::hasColumn("lembretes_pagamento","lida_em")) {
                $t->timestamp("lida_em")->nullable()->after("enviado_em");
                $t->index(["aluno_id","lida_em"]);
            }
        });
    }
    public function down(): void {
        Schema::table("lembretes_pagamento", function (Blueprint $t) {
            if (Schema::hasColumn("lembretes_pagamento","lida_em")) {
                $t->dropIndex(["aluno_id","lida_em"]);
                $t->dropColumn("lida_em");
            }
        });
    }
};
