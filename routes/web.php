<?php

use Illuminate\Support\Facades\Route;

/*
| Shell PWA Almara Chat. Seluruh data diambil lewat /api/v1.
| @2026-Alifiandra
*/

Route::view('/', 'app')->name('app');
Route::view('/offline', 'offline')->name('offline');

Route::get('/manifest.webmanifest', function () {
    $name = config('chatme.name');

    return response()->json([
        'id' => '/',
        'name' => $name,
        'short_name' => 'ChatMe',
        'description' => 'Chat pribadi & bisnis — satu akun, banyak perangkat.',
        'start_url' => '/?source=pwa',
        'scope' => '/',
        'display' => 'standalone',
        'display_override' => ['window-controls-overlay', 'standalone'],
        'orientation' => 'any',
        'background_color' => '#1E1530',
        'theme_color' => '#2A1D40',
        'lang' => 'id',
        'categories' => ['social', 'business', 'productivity'],
        'icons' => [
            ['src' => '/icons/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
            ['src' => '/icons/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
            ['src' => '/icons/maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
        ],
        'shortcuts' => [
            ['name' => 'Chat baru', 'url' => '/?action=new-chat', 'icons' => [['src' => '/icons/icon-192.png', 'sizes' => '192x192']]],
            ['name' => 'Tautkan perangkat', 'url' => '/?action=link-device', 'icons' => [['src' => '/icons/icon-192.png', 'sizes' => '192x192']]],
        ],
    ], 200, ['Content-Type' => 'application/manifest+json']);
})->name('manifest');
