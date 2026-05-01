<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class Mes extends Model {
    protected $table = "meses";
    public $incrementing = false;
    protected $keyType   = "int";
    protected $fillable  = ["id","nome","abreviatura","ordem"];
}
