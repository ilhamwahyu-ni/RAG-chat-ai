<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResearchItem extends Model
{
    /** @use HasFactory<\Database\Factories\ResearchItemFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'original_url',
        'file_path',
        'provider_file_id',
        'ai_summary',
        'web_research',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function isImage(): bool
    {
        return $this->type === 'image';
    }

    public function isDocument(): bool
    {
        return $this->type === 'document';
    }

    public function isUrl(): bool
    {
        return $this->type === 'url';
    }

    public function isProcessed(): bool
    {
        return $this->ai_summary !== null;
    }
}
