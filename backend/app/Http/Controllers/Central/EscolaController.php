<?php
namespace App\Http\Controllers\Central;
use App\Http\Controllers\Controller;
use App\Models\Central\Escola;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

class EscolaController extends Controller {

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function dbName(Escola $escola): string
    {
        $slug = preg_replace("/[^a-z0-9]/", "", strtolower($escola->codigo));
        return "escola_" . substr($slug, 0, 20);
    }

    private function provision(Escola $escola): void
    {
        $dbName = $this->dbName($escola);
        $dbUser = env("DB_USERNAME", "educasoft");

        // Store DB name so Stancl uses it (internal attribute tenancy_db_name)
        $escola->setAttribute("tenancy_db_name", $dbName);
        $escola->saveQuietly();

        // Create DB and grant access using root credentials
        $pdo = new \PDO(
            "mysql:host=" . env("DB_ROOT_HOST", "127.0.0.1") . ";port=" . env("DB_PORT", 3306),
            env("DB_ROOT_USERNAME", "root"),
            env("DB_ROOT_PASSWORD"),
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("GRANT ALL PRIVILEGES ON `{$dbName}`.* TO '{$dbUser}'@'%'");
        $pdo->exec("FLUSH PRIVILEGES");
    }

    private function runMigrationsAndAdmin(Escola $escola, ?string $adminNome, ?string $adminEmail, ?string $adminPasswordHash): void
    {
        tenancy()->initialize($escola->fresh());

        Artisan::call("migrate", [
            "--path"  => "database/migrations/tenant",
            "--force" => true,
        ]);

        if ($adminEmail) {
            \App\Models\Tenant\User::firstOrCreate(
                ["email" => $adminEmail],
                [
                    "nome"     => $adminNome ?? "Administrador",
                    "password" => $adminPasswordHash ?? bcrypt("Admin@" . now()->year),
                    "tipo"     => "admin",
                    "ativo"    => true,
                ]
            );
        }

        tenancy()->end();
    }

    // ── Routes ─────────────────────────────────────────────────────────────────

    public function index() {
        return response()->json(Escola::withCount("domains")->paginate(20));
    }

    public function activate(Request $request, Escola $escola) {
        if ($escola->ativo) {
            return response()->json(["message" => "Escola já está activa."]);
        }
        try {
            $this->provision($escola);
            $this->runMigrationsAndAdmin(
                $escola,
                $request->admin_nome  ?? $escola->admin_nome  ?? "Administrador",
                $request->admin_email ?? $escola->admin_email ?? null,
                $request->admin_password ? bcrypt($request->admin_password) : ($escola->admin_password ?? null)
            );
            $escola->update(["ativo" => true]);
            return response()->json(["message" => "Escola activada com sucesso.", "escola" => $escola]);
        } catch (\Throwable $e) {
            tenancy()->end();
            return response()->json(["message" => "Erro ao activar: " . $e->getMessage()], 500);
        }
    }

    public function deactivate(Escola $escola) {
        $escola->update(["ativo" => false]);
        return response()->json(["message" => "Escola desactivada.", "escola" => $escola]);
    }

    public function store(Request $request) {
        $request->validate([
            "nome"           => "required|string|max:255",
            "email"          => "required|email|unique:tenants,email",
            "codigo"         => ["required", "string", "max:30", "unique:tenants,codigo", "regex:/^[a-z0-9\-]+$/"],
            "plano"          => "required|in:basico,standard,premium",
            "admin_nome"     => "required|string",
            "admin_email"    => "required|email",
            "admin_password" => "required|min:6",
        ]);

        $escola = Escola::withoutEvents(function () use ($request) {
            return Escola::create([
                "id"             => Str::ulid(),
                "nome"           => $request->nome,
                "email"          => $request->email,
                "telefone"       => $request->telefone,
                "endereco"       => $request->endereco,
                "codigo"         => strtolower($request->codigo),
                "plano"          => $request->plano,
                "ativo"          => false,
                "admin_nome"     => $request->admin_nome,
                "admin_email"    => $request->admin_email,
                "admin_password" => bcrypt($request->admin_password),
            ]);
        });

        $escola->domains()->create(["domain" => strtolower($request->codigo) . ".educa.okulandisa.com"]);

        try {
            $this->provision($escola);
            $this->runMigrationsAndAdmin(
                $escola,
                $request->admin_nome,
                $request->admin_email,
                bcrypt($request->admin_password)
            );
            $escola->update(["ativo" => true]);
            return response()->json(["message" => "Escola criada e activada.", "escola" => $escola], 201);
        } catch (\Throwable $e) {
            tenancy()->end();
            return response()->json([
                "message"     => "Escola criada mas provisionamento falhou: " . $e->getMessage(),
                "escola"      => $escola,
                "provisioned" => false,
            ], 201);
        }
    }

    public function show(Escola $escola) {
        return response()->json($escola->load("domains"));
    }

    public function update(Request $request, Escola $escola) {
        $escola->update($request->only(["nome","email","telefone","endereco","plano","ativo"]));
        return response()->json(["message" => "Escola actualizada.", "escola" => $escola]);
    }

    public function destroy(Escola $escola) {
        $escola->delete();
        return response()->json(["message" => "Escola removida."]);
    }

    public function dashboard() {
        return response()->json([
            "total_escolas"   => Escola::count(),
            "escolas_ativas"  => Escola::where("ativo", true)->count(),
            "escolas"         => Escola::latest()->take(10)->get(),
        ]);
    }
}
