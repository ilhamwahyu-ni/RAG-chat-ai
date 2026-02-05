<?php

namespace App\Http\Controllers;

use App\Agents\ResearchAgent;
use App\Http\Requests\SendMessageRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Responses\StreamableAgentResponse;

class ConversationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $conversations = DB::table('agent_conversations')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['id', 'title', 'created_at', 'updated_at']);

        $currentConversation = null;
        $messages = [];

        if ($request->has('conversation')) {
            $currentConversation = DB::table('agent_conversations')
                ->where('id', $request->get('conversation'))
                ->where('user_id', $user->id)
                ->first(['id', 'title', 'created_at']);

            if ($currentConversation) {
                $messages = DB::table('agent_conversation_messages')
                    ->where('conversation_id', $currentConversation->id)
                    ->orderBy('created_at')
                    ->get(['id', 'role', 'content', 'tool_calls', 'created_at']);
            }
        }

        return Inertia::render('research/chat', [
            'conversations' => $conversations,
            'currentConversation' => $currentConversation,
            'messages' => $messages,
        ]);
    }

    public function message(SendMessageRequest $request): StreamableAgentResponse
    {
        $user = $request->user();
        $conversationId = $request->validated('conversation_id');

        $agent = new ResearchAgent($user);

        if ($conversationId) {
            // Verify user owns this conversation
            $exists = DB::table('agent_conversations')
                ->where('id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (! $exists) {
                abort(403);
            }

            $agent->continue($conversationId, $user);
        } else {
            $agent->forUser($user);
        }

        return $agent->stream($request->validated('message'));
    }

    public function destroy(Request $request, string $conversation): RedirectResponse
    {
        $deleted = DB::table('agent_conversations')
            ->where('id', $conversation)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (! $deleted) {
            abort(403);
        }

        DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversation)
            ->delete();

        return redirect()->route('research.chat')
            ->with('success', 'Conversation deleted.');
    }
}
