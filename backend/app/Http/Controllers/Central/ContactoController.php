<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Mail\ContactoMail;
use App\Models\Central\Contacto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

class ContactoController extends Controller {
    public function store(Request $request) {
        $key = "contacto:" . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                "message" => "Demasiadas tentativas. Tente novamente daqui a alguns minutos.",
            ], 429);
        }
        RateLimiter::hit($key, 600);

        $data = $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "required|email|max:255",
            "escola"   => "nullable|string|max:255",
            "telefone" => "nullable|string|max:50",
            "mensagem" => "required|string|max:5000",
            "website"  => "nullable|max:0",
        ]);
        unset($data["website"]);

        $contacto = Contacto::create(array_merge($data, [
            "estado" => "novo",
            "ip"     => $request->ip(),
        ]));

        try {
            Mail::to("contact@educaja.com")->send(new ContactoMail($data));
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar email de contacto Educajá: " . $e->getMessage(), $data);
        }

        return response()->json([
            "message" => "Mensagem enviada. Responderemos em breve.",
            "id"      => $contacto->id,
        ]);
    }

    public function index(Request $request) {
        $q = Contacto::query()->orderByDesc("created_at");
        if ($estado = $request->query("estado")) $q->where("estado", $estado);
        if ($s = $request->query("q")) {
            $q->where(function ($w) use ($s) {
                $w->where("nome", "like", "%{$s}%")
                  ->orWhere("email", "like", "%{$s}%")
                  ->orWhere("escola", "like", "%{$s}%")
                  ->orWhere("mensagem", "like", "%{$s}%");
            });
        }
        return response()->json($q->paginate(20));
    }

    public function update(Request $request, Contacto $contacto) {
        $data = $request->validate([
            "estado"     => "nullable|in:novo,em_curso,resolvido,arquivado",
            "nota_admin" => "nullable|string|max:5000",
        ]);
        $contacto->update($data);
        return response()->json($contacto);
    }

    public function destroy(Contacto $contacto) {
        $contacto->delete();
        return response()->json(["ok" => true]);
    }
}
