<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Status;
use App\Services\ChatService;
use App\Services\StatusService;
use Illuminate\Database\Seeder;

/**
 * Data contoh untuk mencoba aplikasi secara lokal (nama netral, bukan data asli).
 * Login: 081200000001 / 081200000002 / 081200000003 — kode OTP muncul di layar saat APP_DEBUG=true.
 * @2026-Alifiandra
 */
class DatabaseSeeder extends Seeder
{
    public function run(ChatService $chat, StatusService $statuses): void
    {
        $a = User::firstOrCreate(['phone' => '6281200000001'], ['name' => 'Pengguna Satu', 'about' => 'Tersedia', 'phone_verified_at' => now()]);
        $b = User::firstOrCreate(['phone' => '6281200000002'], ['name' => 'Pengguna Dua', 'about' => 'Sedang bekerja', 'phone_verified_at' => now()]);
        $c = User::firstOrCreate(['phone' => '6281200000003'], ['name' => 'Pengguna Tiga', 'phone_verified_at' => now()]);

        $direct = $chat->findOrCreateDirect($a, $b);
        if (! $direct->messages()->exists()) {
            $chat->send($direct, $b, ['body' => 'Halo! Selamat datang di Almara Chat 👋']);
            $chat->send($direct, $a, ['body' => 'Halo, terima kasih. Aplikasinya bisa di-install di HP juga ya?']);
            $chat->send($direct, $b, ['body' => 'Bisa. Buka di browser HP, lalu pilih "Install aplikasi" atau "Tambahkan ke Layar Utama".']);
        }

        if (! Status::where('user_id', $b->id)->exists()) {
            $status = Status::create([
                'user_id' => $b->id,
                'type' => 'text',
                'body' => 'Selamat pagi! Status ini otomatis hilang setelah 24 jam ☀️',
                'meta' => ['color' => '#2F7D6D', 'font' => 'sans'],
                'audience' => 'contacts',
                'expires_at' => now()->addHours(Status::TTL_HOURS),
            ]);
            $status->recipients()->sync($statuses->audienceFor($b));
        }

        if (! $a->conversations()->where('type', 'group')->exists()) {
            $group = $chat->createGroup($a, 'Tim Operasional', [$b->id, $c->id], 'Koordinasi harian tim');
            $chat->send($group, $c, ['body' => 'Selamat pagi semua, laporan hari ini menyusul ya.']);
        }
    }
}
