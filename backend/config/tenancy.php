<?php
use Stancl\Tenancy\Database\Models\Domain;
use App\Models\Central\Escola;

return [
    "tenant_model" => Escola::class,
    "id_generator" => Stancl\Tenancy\Database\Concerns\HasUlids::class,
    "domain_model" => Domain::class,
    "central_domains" => array_values(array_filter(array_map(
        "trim",
        explode(",", env("CENTRAL_DOMAIN", "educa.okulandisa.com"))
    ))),
    "tenancy_bootstrappers" => [
        Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
    ],
    "database" => [
        "based_on" => null,
        "central_connection" => env("DB_CONNECTION", "mysql"),
        "prefix" => "",
        "suffix" => "",
        "managers" => [
            "mysql" => Stancl\Tenancy\TenantDatabaseManagers\MySQLDatabaseManager::class,
        ],
        "template_tenant_connection" => "mysql",
        "grants" => null,
        "creation_statements" => [],
        "purge_managers_on_new_tenant" => false,
    ],
    "cache" => ["tag_base" => "tenant"],
    "filesystem" => [
        "suffix_base" => "tenant",
        "disks" => ["local","public"],
        "root_override" => [],
        "override_storage_path" => null,
        "suffix_override" => [],
    ],
    "redis" => ["prefix_override" => []],
    "features" => [],
    "migration_parameters" => [
        "--force" => true,
        "--path" => database_path("migrations/tenant"),
        "--realpath" => true,
    ],
    "seeder_parameters" => ["--class" => "DatabaseSeeder"],
];
