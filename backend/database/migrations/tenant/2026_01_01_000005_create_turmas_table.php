<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("turmas", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("nivel");
            $table->string("turno")->default("manha");
            $table->string("ano_letivo");
            $table->integer("capacidade")->default(40);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("turmas"); }
};
