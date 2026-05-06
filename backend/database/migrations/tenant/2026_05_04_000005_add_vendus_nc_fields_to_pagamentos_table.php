<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            $t->string("vendus_nc_document_id", 50)->nullable()->index();
            $t->string("vendus_nc_numero", 60)->nullable();
            $t->string("vendus_nc_hash", 60)->nullable();
            $t->string("vendus_nc_pdf_url", 500)->nullable();
            $t->timestamp("vendus_nc_emitido_em")->nullable();
            $t->string("vendus_nc_motivo", 500)->nullable();
            $t->text("vendus_nc_erro")->nullable();
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            $t->dropColumn([
                "vendus_nc_document_id","vendus_nc_numero","vendus_nc_hash",
                "vendus_nc_pdf_url","vendus_nc_emitido_em","vendus_nc_motivo","vendus_nc_erro",
            ]);
        });
    }
};
