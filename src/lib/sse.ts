type ChannelKey = string

type Listener = {
	key: ChannelKey
	send: (data: unknown) => void
	close: () => void
}

declare global {
	// eslint-disable-next-line no-var
	var __BUILDABLES_SSE__: {
		listeners: Map<ChannelKey, Set<Listener>>
	}
}

const store = (globalThis.__BUILDABLES_SSE__ ||= {
	listeners: new Map<ChannelKey, Set<Listener>>(),
})

export function channelKey(projectId?: string, userId?: string): ChannelKey {
	return `project:${projectId || 'none'}|user:${userId || 'none'}`
}

export function addListener(key: ChannelKey, send: (data: unknown) => void, close: () => void): () => void {
	let set = store.listeners.get(key)
	if (!set) {
		set = new Set<Listener>()
		store.listeners.set(key, set)
	}
	const listener: Listener = { key, send, close }
	set.add(listener)
	return () => {
		set?.delete(listener)
		if (set && set.size === 0) store.listeners.delete(key)
	}
}

export function broadcast(key: ChannelKey, payload: unknown): void {
	const set = store.listeners.get(key)
	if (!set || set.size === 0) return
	for (const l of set) {
		try { l.send(payload) } catch {}
	}
}


