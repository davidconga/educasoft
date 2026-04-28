<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Central\AuthController;
use App\Http\Controllers\Central\EscolaController;
use App\Http\Controllers\Central\RegisterController;
use App\Http\Controllers\Central\PasswordResetController;

Route::prefix("v1")->group(function () {
    // Public routes
    Route::post("auth/login", [AuthController::class, "login"]);
    Route::get("planos", [RegisterController::class, "planos"]);
    Route::post("register", [RegisterController::class, "store"]);
    Route::post("forgot-password", [PasswordResetController::class, "forgotPassword"]);
    Route::post("reset-password", [PasswordResetController::class, "resetPassword"]);

    Route::middleware("auth:sanctum")->group(function () {
        Route::post("auth/logout", [AuthController::class, "logout"]);
        Route::get("dashboard", [EscolaController::class, "dashboard"]);
        Route::post("escolas/{escola}/activate", [EscolaController::class, "activate"]);
        Route::post("escolas/{escola}/deactivate", [EscolaController::class, "deactivate"]);
        Route::apiResource("escolas", EscolaController::class);
    });
});
