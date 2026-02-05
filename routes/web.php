<?php

use App\Http\Controllers\ConversationController;
use App\Http\Controllers\ResearchController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('research', [ResearchController::class, 'index'])->name('research.index');
    Route::post('research', [ResearchController::class, 'store'])->name('research.store');
    Route::delete('research/{item}', [ResearchController::class, 'destroy'])->name('research.destroy');

    Route::get('research/chat', [ConversationController::class, 'index'])->name('research.chat');
    Route::post('research/chat', [ConversationController::class, 'message'])->name('research.message');
    Route::delete('research/chat/{conversation}', [ConversationController::class, 'destroy'])->name('research.chat.destroy');
});

require __DIR__.'/settings.php';
