<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("facturas_central", function (Blueprint $t) {
            $t->string("vendus_document_id", 50)->nullable()->index();
            $t->string("vendus_numero", 60)->nullable();
            $t->string("vendus_hash", 60)->nullable();
            $t->string("vendus_serie", 30)->nullable();
            $t->string("vendus_pdf_url", 500)->nullable();
            $t->timestamp("vendus_emitido_em")->nullable();
            $t->text("vendus_erro")->nullable();
        });
    }
    public function down(): void {
        Schema::table("facturas_central", function (Blueprint $t) {
            $t->dropColumn([
                "vendus_document_id","vendus_numero","vendus_hash","vendus_serie",
                "vendus_pdf_url","vendus_emitido_em","vendus_erro",
            ]);
        });
    }
};
