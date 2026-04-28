<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Escola;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RegisterController extends Controller
{
    private static array $PLANOS = [
        [
            "id"          => "basico",
            "nome"        => "Básico",
            "preco"       => 0,
            "periodo"     => "mês",
            "descricao"   => "Ideal para escolas pequenas que estão a começar.",
            "max_alunos"  => 100,
            "destaque"    => false,
            "features"    => [
                "Até 100 alunos",
                "Gestão de turmas e disciplinas",
                "Lançamento de notas e boletins",
                "Controlo de presenças",
                "1 administrador",
            ],
        ],
        [
            "id"          => "standard",
            "nome"        => "Standard",
            "preco"       => 15000,
            "periodo"     => "mês",
            "descricao"   => "Para escolas em crescimento que precisam de mais recursos.",
            "max_alunos"  => 500,
            "destaque"    => true,
            "features"    => [
                "Até 500 alunos",
                "Tudo do plano Básico",
                "Aulas remotas e materiais",
                "Gestão financeira (propinas e emolumentos)",
                "Relatórios avançados",
                "Até 5 administradores",
            ],
        ],
        [
            "id"          => "premium",
            "nome"        => "Premium",
            "preco"       => 35000,
            "periodo"     => "mês",
            "descricao"   => "Solução completa para grandes instituições de ensino.",
            "max_alunos"  => -1,
            "destaque"    => false,
            "features"    => [
                "Alunos ilimitados",
                "Tudo do plano Standard",
                "Multi-turno e multi-turma",
                "Suporte prioritário 24/7",
                "Integrações e API",
                "Administradores ilimitados",
            ],
        ],
    ];

    public function planos()
    {
        return response()->json(self::$PLANOS);
    }

    public function store(Request $request)
    {
        $request->validate([
            "nome"            => "required|string|max:255",
            "email"           => "required|email|unique:tenants,email",
            "telefone"        => "nullable|string|max:30",
            "endereco"        => "nullable|string|max:500",
            "codigo"          => ["required", "string", "max:30", "unique:tenants,codigo", "regex:/^[a-z0-9\-]+$/"],
            "plano"           => "required|in:basico,standard,premium",
            "admin_nome"      => "required|string|max:255",
            "admin_email"     => "required|email",
            "admin_password"  => "required|min:8|confirmed",
        ], [
            "email.unique"  => "Já existe uma escola registada com este email.",
            "codigo.unique" => "Este código já está em uso. Escolha outro.",
            "codigo.regex"  => "O código só pode conter letras minúsculas, números e hífens.",
        ]);

        // withoutEvents prevents Stancl from auto-provisioning the tenant DB on create.
        // The escola starts as ativo=false and is provisioned manually by an admin.
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

        $escola->domains()->create([
            "domain" => strtolower($request->codigo) . ".educa.okulandisa.com",
        ]);

        return response()->json([
            "message" => "Cadastro recebido com sucesso! A sua escola será activada em breve.",
            "codigo"  => $escola->codigo,
            "nome"    => $escola->nome,
        ], 201);
    }
}
