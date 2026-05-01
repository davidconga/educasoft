<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Mes;

class MesController extends Controller {
    public function index() {
        return response()->json(Mes::orderBy("ordem")->get());
    }
}
