<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Chaves de idempotência para escritas vindas da app offline.
 *
 *  - `key`             : valor exacto do header `Idempotency-Key` enviado pelo cliente.
 *                        Pertence ao request, não ao recurso — um único POST tem
 *                        uma chave.
 *  - `user_id`         : utilizador autenticado quando a chave foi registada.
 *                        Evita replays cruzados entre utilizadores.
 *  - `method` / `path` : método e caminho normalizados. Para detectar abuso
 *                        (mesma chave usada para endpoints diferentes).
 *  - `request_hash`    : sha256 do payload normalizado. Se a chave já existe
 *                        mas o body diferir, devolvemos 409 — não devolvemos
 *                        a resposta antiga (seria errado).
 *  - `status_code`     : HTTP code da resposta original; null enquanto a primeira
 *                        execução ainda corre.
 *  - `response_body`   : JSON serializado da resposta original (apenas para 2xx);
 *                        nulo até completar.
 *  - `processing_until`: lock leve — se ainda dentro deste timestamp, a request
 *                        original ainda está a ser servida noutro processo.
 *                        Evita execuções concorrentes da mesma chave (race entre
 *                        retry do cliente e o pedido original em curso).
 *  - `expires_at`      : auto-limpeza após N dias (7 dias por defeito).
 */
return new class extends Migration {
    public function up(): void {
        Schema::create("idempotency_keys", function (Blueprint $t) {
            $t->id();
            $t->string("key", 80)->unique();
            $t->unsignedBigInteger("user_id")->nullable()->index();
            $t->string("method", 10);
            $t->string("path", 255);
            $t->string("request_hash", 64);
            $t->unsignedSmallInteger("status_code")->nullable();
            $t->longText("response_body")->nullable();
            $t->timestamp("processing_until")->nullable();
            $t->timestamp("expires_at")->index();
            $t->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists("idempotency_keys");
    }
};
