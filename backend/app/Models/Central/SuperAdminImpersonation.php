<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class SuperAdminImpersonation extends Model {
    protected $fillable = [
        'super_admin_id', 'super_admin_email',
        'tenant_id', 'tenant_codigo',
        'tenant_user_id', 'tenant_user_email', 'tenant_user_nome',
        'motivo', 'ip', 'user_agent',
        'expires_at', 'revoked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];
}
