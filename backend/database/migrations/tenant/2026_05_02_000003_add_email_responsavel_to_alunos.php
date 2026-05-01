<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("alunos", function (Blueprint $t) {
            if (!Schema::hasColumn("alunos","email_responsavel")) {
                $t->string("email_responsavel")->nullable()->after("telefone_responsavel");
            }
        });
    }
    public function down(): void {
        Schema::table("alunos", function (Blueprint $t) {
            if (Schema::hasColumn("alunos","email_responsavel")) {
                $t->dropColumn("email_responsavel");
            }
        });
    }
};
