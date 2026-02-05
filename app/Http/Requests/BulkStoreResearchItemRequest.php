<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class BulkStoreResearchItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'files' => ['nullable', 'array', 'max:20'],
            'files.*' => ['file', 'max:20480'],
            'urls' => ['nullable', 'string', 'max:50000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $hasFiles = ! empty($this->file('files'));
            $hasUrls = trim((string) $this->input('urls')) !== '';

            if (! $hasFiles && ! $hasUrls) {
                $validator->errors()->add('files', 'Please provide at least one file or URL.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.max' => 'You can upload a maximum of 20 files at once.',
            'files.*.max' => 'Each file must not exceed 20MB.',
        ];
    }

    /**
     * Parse the URLs textarea into an array of valid URLs.
     *
     * @return array<int, string>
     */
    public function parsedUrls(): array
    {
        $raw = trim((string) $this->validated('urls'));

        if ($raw === '') {
            return [];
        }

        return collect(explode("\n", $raw))
            ->map(fn (string $line) => trim($line))
            ->filter(fn (string $line) => $line !== '' && filter_var($line, FILTER_VALIDATE_URL))
            ->values()
            ->all();
    }
}
