<?php

/**
 * Konfigurasi Almara Chat (ChatMe).
 * @2026-Alifiandra
 */
return [
    'name' => env('CHATME_NAME', 'Almara Chat'),

    'signature' => '@2026-Alifiandra',

    'default_country_code' => env('CHATME_COUNTRY_CODE', '62'),

    'otp' => [
        // log  : kode ditulis ke storage/logs (dan ditampilkan di layar saat APP_DEBUG=true)
        // http : kirim lewat WhatsApp/SMS gateway Anda (POST JSON {phone, message, code})
        'driver' => env('OTP_DRIVER', 'log'),
        'length' => 6,
        'ttl_minutes' => (int) env('OTP_TTL_MINUTES', 5),
        'resend_seconds' => (int) env('OTP_RESEND_SECONDS', 60),
        'max_attempts' => 5,
        'show_in_response' => (bool) env('OTP_SHOW_IN_RESPONSE', env('APP_DEBUG', false)),
        'http' => [
            'url' => env('OTP_HTTP_URL'),
            'token' => env('OTP_HTTP_TOKEN'),
            'message' => env('OTP_HTTP_MESSAGE', 'Kode verifikasi Almara Chat Anda: :code. Berlaku :minutes menit. Jangan berikan kode ini kepada siapa pun.'),
        ],
    ],

    'devices' => [
        'max_active' => (int) env('CHATME_MAX_DEVICES', 5),
        'link_ttl_seconds' => 180,
    ],

    'uploads' => [
        'max_kb' => (int) env('CHATME_MAX_UPLOAD_KB', 20480),
        'avatar_max_kb' => 4096,
    ],

    // Alamat Reverb yang dipakai browser (boleh berbeda dari alamat internal server).
    'realtime' => [
        'host' => env('REVERB_PUBLIC_HOST', env('REVERB_HOST')),
        'port' => env('REVERB_PUBLIC_PORT', env('REVERB_PORT', 8080)),
        'scheme' => env('REVERB_PUBLIC_SCHEME', env('REVERB_SCHEME', 'http')),
    ],

    'groups' => [
        'max_members' => (int) env('CHATME_GROUP_MAX_MEMBERS', 256),
    ],
];
