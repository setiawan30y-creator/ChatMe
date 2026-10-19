<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Status 24 jam: status, penerima yang diizinkan (snapshot privasi saat diposting), dan siapa yang melihat.
 * @2026-Alifiandra
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10); // text | image | video
            $table->text('body')->nullable(); // teks status atau keterangan media
            $table->json('meta')->nullable(); // warna latar, font
            $table->string('media_path')->nullable();
            $table->string('media_mime', 100)->nullable();
            $table->unsignedBigInteger('media_size')->nullable();
            $table->string('audience', 10)->default('contacts'); // contacts | except | only
            $table->timestamp('expires_at')->index();
            $table->timestamps();
            $table->index(['user_id', 'expires_at']);
        });

        Schema::create('status_recipients', function (Blueprint $table) {
            $table->foreignId('status_id')->constrained('statuses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['status_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('status_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('status_id')->constrained('statuses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('viewed_at');
            $table->unique(['status_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('status_views');
        Schema::dropIfExists('status_recipients');
        Schema::dropIfExists('statuses');
    }
};
