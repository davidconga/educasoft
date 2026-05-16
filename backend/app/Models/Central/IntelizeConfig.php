<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class IntelizeConfig extends Model {
    protected $connection = "mysql";
    protected $table = "intelize_config";
    protected $guarded = [];
    protected $casts = [
        "activo"         => "boolean",
        "validade_dias"  => "integer",
        "token_ttl_min"  => "integer",
        "password"       => "encrypted",
        "webhook_secret" => "encrypted",
    ];

    public static function current(): self {
        return static::firstOrCreate(["id" => 1], [
            "base_url"        => env("INTELIZE_BASE_URL", "https://demo.api.intelize.digital/v1"),
            "username"        => env("INTELIZE_USERNAME"),
            "password"        => env("INTELIZE_PASSWORD"),
            "entidade"        => env("INTELIZE_ENTIDADE"),
            "criador"         => env("INTELIZE_CRIADOR"),
            "auth_path"       => env("INTELIZE_AUTH_PATH", "/auth"),
            "references_path" => env("INTELIZE_REFERENCES_PATH", "/references"),
            "validade_dias"   => (int) env("INTELIZE_VALIDADE_DIAS", 30),
            "token_ttl_min"   => (int) env("INTELIZE_TOKEN_TTL_MIN", 50),
            "activo"          => strtolower((string) env("REF_GATEWAY_DRIVER", "")) === "intelize",
            "webhook_secret"  => env("REF_WEBHOOK_SECRET"),
        ]);
    }
}
