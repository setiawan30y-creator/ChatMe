<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_normalizes_indonesian_formats(): void
    {
        $this->assertSame('6281234567890', PhoneNumber::normalize('0812-3456-7890'));
        $this->assertSame('6281234567890', PhoneNumber::normalize('+62 812 3456 7890'));
        $this->assertSame('6281234567890', PhoneNumber::normalize('81234567890'));
        $this->assertSame('6581234567', PhoneNumber::normalize('0065 8123 4567'));
        $this->assertNull(PhoneNumber::normalize('123'));
        $this->assertNull(PhoneNumber::normalize('abc'));
    }
}
