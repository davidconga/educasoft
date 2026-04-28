<?php
namespace App\Models\Tenant;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable {
    use HasApiTokens, Notifiable;
    protected $fillable = ["nome","email","password","telefone","foto","tipo","ativo","permissoes"];
    protected $hidden = ["password","remember_token"];
    protected $casts = ["password"=>"hashed","ativo"=>"boolean","permissoes"=>"array"];
}
