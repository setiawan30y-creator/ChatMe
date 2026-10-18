# Almara Chat (ChatMe)

Platform komunikasi pribadi & bisnis — **satu akun, banyak perangkat**. PWA yang bisa di-install di HP dan komputer, dibangun dengan Laravel 13 + Laravel Reverb (WebSocket real-time).

> Dibuat oleh **@2026-Alifiandra** · Mengacu pada *Blueprint Almara Chat v1.0* (Fase 1 + sebagian Fase 2).

## Fitur

| Area | Yang sudah ada |
|---|---|
| Akun | Login/daftar dengan nomor HP + OTP (masa berlaku, batas percobaan, jeda kirim ulang, rate limit), profil, foto, info |
| Chat | Chat pribadi & grup, kirim teks/foto/video/dokumen/pesan suara, balas, reaksi emoji, edit (15 menit), hapus untuk semua, cari pesan, format `*tebal*` `_miring_` `~coret~`, tautan otomatis |
| Status | Terkirim ✓ · diterima ✓✓ · dibaca ✓✓ (emas), indikator *sedang mengetik*, online / terakhir dilihat |
| Grup | Admin & pemilik, tambah/keluarkan anggota, jadikan admin, ganti nama/deskripsi/foto, mode "hanya admin yang kirim", pesan sistem |
| Perangkat tertaut | Tautkan perangkat baru lewat **QR** atau **kode**, daftar perangkat, ganti nama, **putuskan dari jarak jauh** (langsung keluar), batas jumlah perangkat |
| Notifikasi | Mode Normal / Hanya suara / Privat / Senyap, pratinjau on/off, bisukan per chat, badge ikon aplikasi |
| PWA | Bisa di-install, service worker, shell offline, antrean pesan saat offline (dikirim otomatis), tema terang/gelap |
| Real-time | Laravel Reverb. Jika Reverb mati, aplikasi otomatis beralih ke sinkronisasi berkala — pesan tetap sampai |
| API | REST `/api/v1` — PWA memakai sesi (cookie), aplikasi Flutter nanti memakai Bearer token (`mode=token`) |
| Keamanan | Semua akses dicek di server (anggota percakapan), lampiran privat, idempotensi pengiriman (`client_uuid`), pencarian nomor hanya pencocokan penuh |

Belum termasuk (fase berikutnya sesuai blueprint): Private Space/Dual Security, multi-company workspace, Business Inbox, terjemahan, Web Push saat aplikasi tertutup, panggilan suara/video, WhatsApp Gateway.

## Instalasi di Laragon (Windows)

Prasyarat: Laragon dengan **PHP 8.3+**, MySQL, Composer.

Buka **PowerShell** lalu jalankan:

```powershell
cd C:\laragon\www\ChatMe

# 1. Dependensi PHP
composer install

# 2. Konfigurasi
Copy-Item .env.example .env
php artisan key:generate

# 3. Database MySQL "chatme" (pastikan MySQL Laragon sudah Start)
& "C:\laragon\bin\mysql\$((Get-ChildItem C:\laragon\bin\mysql)[0].Name)\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS chatme CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --seed
```

Lalu di Laragon klik **Reload** (Apache/Nginx) — situs tersedia di **http://chatme.test**.

### Menjalankan server real-time (Reverb)

Buka jendela PowerShell kedua dan biarkan tetap berjalan:

```powershell
cd C:\laragon\www\ChatMe
php artisan reverb:start
```

Tanpa Reverb aplikasi tetap berfungsi (sinkronisasi berkala tiap beberapa detik), tetapi dengan Reverb pesan, status dibaca, dan indikator mengetik tampil seketika.

### Agar bisa di-install sebagai aplikasi (PWA)

Browser hanya mengizinkan install dari **HTTPS** atau `localhost`:

1. Laragon → menu **Apache** (atau Nginx) → **SSL** → **Enabled**.
2. Ubah di `.env`: `APP_URL=https://chatme.test`
3. Buka **https://chatme.test** → ikon *Install* di address bar (Chrome/Edge), atau menu **Pasang** di aplikasi.

Rekam pesan suara dan pemindai QR kamera juga memerlukan HTTPS.

### Mencoba dari HP di jaringan yang sama

Gunakan `ngrok` bawaan Laragon (menu **www → Share**) untuk mendapat alamat HTTPS publik. Jika Reverb ikut diakses dari luar, atur `REVERB_PUBLIC_HOST`, `REVERB_PUBLIC_PORT`, `REVERB_PUBLIC_SCHEME` di `.env`.

## Akun contoh (seeder)

| Nomor HP | Nama |
|---|---|
| 0812 0000 0001 | Pengguna Satu |
| 0812 0000 0002 | Pengguna Dua |
| 0812 0000 0003 | Pengguna Tiga |

Saat `OTP_SHOW_IN_RESPONSE=true` (mode pengembangan), kode OTP tampil di layar login dan juga ditulis ke `storage/logs/laravel.log`.

## OTP lewat WhatsApp / SMS gateway

Untuk produksi, matikan tampilan kode dan arahkan ke gateway Anda:

```dotenv
OTP_DRIVER=http
OTP_SHOW_IN_RESPONSE=false
OTP_HTTP_URL=https://gateway-anda.example/api/send
OTP_HTTP_TOKEN=token-rahasia
```

Aplikasi mengirim `POST` JSON `{ "phone": "62812...", "message": "...", "code": "123456" }` dengan header `Authorization: Bearer <token>`.

## Produksi (ringkas)

- `APP_ENV=production`, `APP_DEBUG=false`, `OTP_SHOW_IN_RESPONSE=false`
- Jalankan Reverb dengan Supervisor dan proxy WebSocket lewat Nginx (`wss://`), set `REVERB_PUBLIC_*` sesuai domain.
- `php artisan config:cache route:cache view:cache`
- Backup database & `storage/app/private` secara berkala.

## Pengujian

```powershell
php artisan test
```

Mencakup OTP (salah/kedaluwarsa/dipakai ulang/batas percobaan), login sesi & token, pencabutan perangkat, isolasi akses percakapan & lampiran, idempotensi pesan, siklus grup & kebijakan kirim, penautan perangkat (QR/kode, sekali pakai), dan batas perangkat.

## Struktur penting

```
app/Http/Controllers/Api/V1/   REST API (Auth, Me, Users, Devices, Conversations, Messages)
app/Services/ChatService.php    Alur pesan: validasi → simpan MySQL → broadcast
app/Services/DeviceManager.php  Sesi perangkat, token, pencabutan, batas perangkat
app/Events/ChatEvent.php        Event real-time ke kanal privat per pengguna
routes/api.php · routes/channels.php
public/js/chatme.js             Klien PWA (vanilla JS, tanpa build step)
public/css/chatme.css           Tampilan (palet songket: aubergine + benang emas)
public/sw.js                    Service worker
```

---

© 2026 Almara · **@2026-Alifiandra**
