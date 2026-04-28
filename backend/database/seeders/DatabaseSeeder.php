<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder {
    public function run(): void {
        User::firstOrCreate(
            ["email" => "admin@edusoft.ao"],
            ["name"=>"Super Admin","password"=>Hash::make("EduSoft@2024!"),"email_verified_at"=>now()]
        );
        $this->command->info("SuperAdmin criado: admin@edusoft.ao / EduSoft@2024!");
    }
}
