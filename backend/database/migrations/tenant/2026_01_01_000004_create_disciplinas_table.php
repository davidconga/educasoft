<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("disciplinas", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("codigo")->unique();
            $table->integer("carga_horaria")->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("disciplinas"); }
};
