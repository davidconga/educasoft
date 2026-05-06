<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class Contacto extends Model {
    protected $connection = "mysql";
    protected $table = "contactos";
    protected $guarded = [];
}
