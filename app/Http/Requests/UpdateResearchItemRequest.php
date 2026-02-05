<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateResearchItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('item')->user_id === $this->user()->id;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:100'],
            'user_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
