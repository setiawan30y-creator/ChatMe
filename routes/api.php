<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ConversationController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Almara Chat REST API v1 — dipakai oleh PWA dan (nanti) aplikasi Flutter.
| @2026-Alifiandra
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Publik (dengan rate limit)
    Route::post('auth/otp', [AuthController::class, 'requestOtp'])->middleware('throttle:otp');
    Route::post('auth/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:otp-verify');
    Route::post('devices/link-requests', [DeviceController::class, 'createLink'])->middleware('throttle:link');
    Route::get('devices/link-requests/{link}', [DeviceController::class, 'linkStatus'])->middleware('throttle:link-poll');

    Route::middleware(['auth:sanctum', 'device', 'throttle:api'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('me', [MeController::class, 'show']);
        Route::patch('me', [MeController::class, 'update']);
        Route::post('me/avatar', [MeController::class, 'avatar']);
        Route::delete('me/avatar', [MeController::class, 'removeAvatar']);
        Route::get('avatars/user/{user}', [MeController::class, 'userAvatar']);
        Route::get('avatars/group/{conversation}', [MeController::class, 'groupAvatar']);

        Route::get('users/search', [UserController::class, 'search']);

        Route::get('devices', [DeviceController::class, 'index']);
        Route::patch('devices/{device}', [DeviceController::class, 'update']);
        Route::delete('devices/{device}', [DeviceController::class, 'destroy']);
        Route::post('devices/link/preview', [DeviceController::class, 'previewLink']);
        Route::post('devices/link/approve', [DeviceController::class, 'approveLink']);

        Route::get('conversations', [ConversationController::class, 'index']);
        Route::post('conversations', [ConversationController::class, 'store']);
        Route::get('conversations/{conversation}', [ConversationController::class, 'show']);
        Route::patch('conversations/{conversation}', [ConversationController::class, 'update']);
        Route::post('conversations/{conversation}/avatar', [ConversationController::class, 'avatar']);
        Route::post('conversations/{conversation}/members', [ConversationController::class, 'addMembers']);
        Route::delete('conversations/{conversation}/members/{user}', [ConversationController::class, 'removeMember']);
        Route::patch('conversations/{conversation}/members/{user}', [ConversationController::class, 'setRole']);
        Route::post('conversations/{conversation}/leave', [ConversationController::class, 'leave']);
        Route::patch('conversations/{conversation}/preferences', [ConversationController::class, 'preferences']);
        Route::post('conversations/{conversation}/receipt', [ConversationController::class, 'receipt']);

        Route::get('conversations/{conversation}/messages', [MessageController::class, 'index']);
        Route::post('conversations/{conversation}/messages', [MessageController::class, 'store'])->middleware('throttle:send');
        Route::patch('messages/{message}', [MessageController::class, 'update']);
        Route::delete('messages/{message}', [MessageController::class, 'destroy']);
        Route::post('messages/{message}/reactions', [MessageController::class, 'react']);
        Route::get('attachments/{attachment}', [MessageController::class, 'attachment']);

        Route::get('sync', [MessageController::class, 'sync']);
    });
});
