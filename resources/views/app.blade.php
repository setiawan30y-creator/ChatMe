<!DOCTYPE html>
@php
    $chatme = [
        'name' => config('chatme.name'),
        'signature' => config('chatme.signature'),
        'version' => '1.0.0',
        'maxUploadMb' => round(config('chatme.uploads.max_kb') / 1024),
        'editWindowMinutes' => \App\Models\Message::EDIT_WINDOW_MINUTES,
        'realtime' => config('broadcasting.default') === 'reverb' ? [
            'key' => config('broadcasting.connections.reverb.key'),
            'host' => config('chatme.realtime.host') ?: request()->getHost(),
            'port' => (int) config('chatme.realtime.port'),
            'scheme' => config('chatme.realtime.scheme'),
        ] : null,
    ];
    $v = substr(md5_file(public_path('js/chatme.js')).md5_file(public_path('css/chatme.css')), 0, 10);
@endphp
{{-- Almara Chat (ChatMe) — PWA shell · @2026-Alifiandra --}}
<html lang="id" data-theme="system">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
    <title>{{ config('chatme.name') }}</title>
    <meta name="description" content="Chat pribadi & bisnis — satu akun, banyak perangkat.">
    <meta name="author" content="@2026-Alifiandra">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#2A1D40">
    <meta name="color-scheme" content="light dark">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="ChatMe">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="/css/chatme.css?v={{ $v }}">
    <script>
        window.CHATME = {!! json_encode($chatme, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) !!};
        (function () {
            try {
                var t = localStorage.getItem('chatme.theme') || 'system';
                document.documentElement.dataset.theme = t;
            } catch (e) {}
        })();
    </script>
</head>
<body>
    <div id="app" aria-live="polite">
        <div class="boot">
            <img src="/icons/icon-192.png" alt="" width="72" height="72">
            <p>Memuat {{ config('chatme.name') }}…</p>
        </div>
    </div>
    <div id="toasts" role="status" aria-live="polite"></div>
    <noscript>Almara Chat memerlukan JavaScript.</noscript>
    <script src="/vendor/pusher.min.js?v=8.4.0"></script>
    <script type="module" src="/js/chatme.js?v={{ $v }}"></script>
</body>
</html>
