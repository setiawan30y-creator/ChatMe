<?php

namespace App\Support;

/**
 * Normalisasi nomor HP ke format internasional tanpa "+" (contoh: 6281234567890).
 * @2026-Alifiandra
 */
class PhoneNumber
{
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $input);
        if ($digits === '' || $digits === null) {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = config('chatme.default_country_code', '62').substr($digits, 1);
        } elseif (str_starts_with($digits, '8') && strlen($digits) <= 13) {
            $digits = config('chatme.default_country_code', '62').$digits;
        }

        $len = strlen($digits);

        return ($len >= 9 && $len <= 15) ? $digits : null;
    }
}
