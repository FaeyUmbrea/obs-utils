/** Resolves an event sender from a user document, user ID or chat message. */
export function getEventUserId(payload: Record<string, unknown>): string | undefined {
	const message = payload.message as { author?: unknown; user?: unknown } | undefined;
	const user = payload.user ?? message?.author ?? message?.user;
	if (typeof user === 'string') return user || undefined;
	if (user && typeof user === 'object' && 'id' in user && typeof user.id === 'string') return user.id || undefined;
	return undefined;
}
