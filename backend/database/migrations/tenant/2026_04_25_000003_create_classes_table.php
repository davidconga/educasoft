<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("classes", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("nivel")->nullable();
            $table->integer("ordem")->nullable();
            $table->unsignedBigInteger("curso_id")->nullable();
            $table->text("descricao")->nullable();
            $table->boolean("ativo")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("classes"); }
};
