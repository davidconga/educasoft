<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('super_admin_impersonations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('super_admin_id')->constrained('users')->cascadeOnDelete();
            $t->string('super_admin_email');
            $t->string('tenant_id');
            $t->string('tenant_codigo');
            $t->unsignedBigInteger('tenant_user_id');
            $t->string('tenant_user_email');
            $t->string('tenant_user_nome')->nullable();
            $t->string('motivo')->nullable();
            $t->string('ip', 45)->nullable();
            $t->string('user_agent', 500)->nullable();
            $t->timestamp('expires_at');
            $t->timestamp('revoked_at')->nullable();
            $t->timestamps();
            $t->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('super_admin_impersonations');
    }
};
