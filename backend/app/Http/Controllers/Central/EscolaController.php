<?php
namespace App\Http\Controllers\Central;
use App\Http\Controllers\Controller;
use App\Models\Central\Contacto;
use App\Models\Central\Escola;
use App\Models\Central\FacturaCentral;
use App\Models\Central\SiteChat;
use App\Models\Central\SuperAdminImpersonation;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
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
        $escola->update($request->only(["nome","email","telefone","endereco","plano","ativo","permite_pago_historico"]));
        return response()->json(["message" => "Escola actualizada.", "escola" => $escola]);
    }

    public function destroy(Escola $escola) {
        $escola->delete();
        return response()->json(["message" => "Escola removida."]);
    }

    /**
     * Super-admin entra no tenant como o user admin (impersonação).
     * Exige password do super-admin como confirmação. Token expira em 4h.
     * Cada uso fica registado em super_admin_impersonations para auditoria.
     */
    public function impersonate(Request $request, Escola $escola) {
        $request->validate([
            'password' => 'required|string',
            'motivo'   => 'nullable|string|max:255',
        ]);

        $superAdmin = $request->user();
        if (!$superAdmin || !Hash::check($request->password, $superAdmin->password)) {
            return response()->json(['message' => 'Password do super-admin inválida.'], 403);
        }

        if (!$escola->ativo) {
            return response()->json(['message' => 'Escola desactivada — activa primeiro.'], 422);
        }

        try {
            tenancy()->initialize($escola);

            $admin = \App\Models\Tenant\User::where('tipo', 'admin')->where('ativo', true)->first();
            if (!$admin) {
                tenancy()->end();
                return response()->json(['message' => 'Tenant não tem nenhum admin activo.'], 404);
            }

            $expiresAt = now()->addHours(4);
            $token = $admin->createToken(
                "impersonation:{$superAdmin->id}",
                ['*'],
                $expiresAt
            )->plainTextToken;

            $payload = [
                'token'      => $token,
                'expires_at' => $expiresAt->toIso8601String(),
                'tenant_id'  => $escola->id,
                'codigo'     => $escola->codigo,
                'admin_user' => [
                    'id'    => $admin->id,
                    'nome'  => $admin->nome,
                    'email' => $admin->email,
                ],
                'sso_url'    => "https://{$escola->codigo}.educa.okulandisa.com/auth/sso?"
                    . http_build_query([
                        't'   => $token,
                        'tc'  => $escola->codigo,
                        'exp' => $expiresAt->timestamp,
                        'src' => 'super-admin',
                    ]),
            ];

            tenancy()->end();

            SuperAdminImpersonation::create([
                'super_admin_id'    => $superAdmin->id,
                'super_admin_email' => $superAdmin->email,
                'tenant_id'         => $escola->id,
                'tenant_codigo'     => $escola->codigo,
                'tenant_user_id'    => $admin->id,
                'tenant_user_email' => $admin->email,
                'tenant_user_nome'  => $admin->nome,
                'motivo'            => $request->motivo,
                'ip'                => $request->ip(),
                'user_agent'        => substr((string) $request->userAgent(), 0, 500),
                'expires_at'        => $expiresAt,
            ]);

            return response()->json($payload);
        } catch (\Throwable $e) {
            try { tenancy()->end(); } catch (\Throwable $_) {}
            return response()->json(['message' => 'Falha: ' . $e->getMessage()], 500);
        }
    }

    /** Lista do histórico de impersonações (auditoria). */
    public function impersonationsHistory(Request $request, Escola $escola) {
        return response()->json(
            SuperAdminImpersonation::where('tenant_id', $escola->id)
                ->orderByDesc('created_at')
                ->paginate(50)
        );
    }

    public function dashboard() {
        $hoje7  = Carbon::now()->subDays(7);
        $hoje30 = Carbon::now()->subDays(30);

        $porPlano = Escola::selectRaw("plano, COUNT(*) as total")->groupBy("plano")->pluck("total", "plano");
        $serieAdesoes = Escola::selectRaw("DATE(created_at) as dia, COUNT(*) as total")
            ->where("created_at", ">=", $hoje30)
            ->groupBy("dia")->orderBy("dia")
            ->get();

        return response()->json([
            "total_escolas"     => Escola::count(),
            "escolas_ativas"    => Escola::where("ativo", true)->count(),
            "escolas_pendentes" => Escola::where("ativo", false)->count(),
            "adesoes_7d"        => Escola::where("created_at", ">=", $hoje7)->count(),
            "adesoes_30d"       => Escola::where("created_at", ">=", $hoje30)->count(),
            "por_plano"         => $porPlano,
            "serie_adesoes"     => $serieAdesoes,

            "chats_abertos"     => SiteChat::where("estado", "!=", "fechado")->count(),
            "chats_nao_lidos"   => (int) SiteChat::sum("nao_lidas_admin"),

            "contactos_novos"   => Contacto::where("estado", "novo")->count(),
            "contactos_total"   => Contacto::count(),

            "facturas_pendentes" => FacturaCentral::where("estado", "pendente")->count(),
            "valor_pendente"     => (float) FacturaCentral::where("estado", "pendente")->sum("total"),
            "valor_pago_mes"     => (float) FacturaCentral::where("estado", "paga")
                                        ->whereMonth("paga_em", Carbon::now()->month)
                                        ->whereYear("paga_em", Carbon::now()->year)
                                        ->sum("total"),
            "facturas_vencidas"  => FacturaCentral::where("estado", "pendente")
                                        ->whereDate("data_vencimento", "<", Carbon::today())->count(),

            "escolas"           => Escola::latest()->take(10)->get(),
        ]);
    }
}
