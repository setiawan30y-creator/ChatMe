<!DOCTYPE html>
{{-- @2026-Alifiandra --}}
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Offline — {{ config('chatme.name') }}</title>
    <style>
        body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1E1530;color:#EDE7F5;font:16px/1.5 "Plus Jakarta Sans",system-ui,sans-serif;text-align:center;padding:24px}
        img{width:72px;height:72px;border-radius:20px}
        h1{font-size:20px;margin:16px 0 4px}
        p{color:#A398B6;margin:0 0 20px}
        button{background:#D9A441;color:#1E1530;border:0;border-radius:999px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer}
    </style>
</head>
<body>
    <main>
        <img src="/icons/icon-192.png" alt="">
        <h1>Anda sedang offline</h1>
        <p>Pesan yang belum terkirim akan dikirim otomatis saat koneksi kembali.</p>
        <button onclick="location.reload()">Coba lagi</button>
    </main>
</body>
</html>
