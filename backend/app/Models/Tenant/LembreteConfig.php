<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class LembreteConfig extends Model {
    protected $table = "lembrete_config";
    protected $fillable = [
        "email_activo","sms_activo","dias_antes","dias_depois","hora_envio",
        "email_assunto","email_template","sms_sender_id","sms_template",
        "sms_gateway_url","sms_gateway_method","sms_gateway_api_key","sms_gateway_payload_template",
    ];
    protected $casts = [
        "email_activo" => "boolean",
        "sms_activo"   => "boolean",
        "dias_antes"   => "array",
        "dias_depois"  => "array",
    ];

    public static function current(): self {
        return self::firstOrCreate(["id" => 1], [
            "email_activo" => true,
            "sms_activo"   => false,
            "dias_antes"   => [3, 1],
            "dias_depois"  => [1, 7, 15],
            "hora_envio"   => "08:00",
        ]);
    }
}
