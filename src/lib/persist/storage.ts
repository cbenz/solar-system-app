/**
 * The persistence module: what the app remembers between visits, and nothing
 * else.
 *
 * **What is stored.** Exactly four fields of session state — the last activity,
 * the active locale, and the two distortion toggles — plus a format version. No
 * instant, no camera, no observers, no mission, and no identifier of any kind:
 * a household shares one device and there is no account, no server and no
 * analytics (spec, "Persistence"). `fromSession` takes only those four, so a
 * later ticket adding a state field must opt in here explicitly.
 *
 * **The format.** `encode` writes one JSON object; `decode` reads it back and
 * never throws.
 *
 * - A corrupt value (`'{not json'`, a bare string, an array), a `null`, or an
 *   empty string is not a persisted state: the defaults come back.
 * - A version this build does not know is not guessed at: the defaults come
 *   back, because a future shape cannot be trusted to decode. Bumping
 *   `PERSIST_VERSION` is what makes a migration (rather than a reset) possible.
 * - A *field* that no longer means anything falls back on its own, keeping the
 *   other three: an activity id the registry no longer holds becomes `null`, and
 *   a locale the app no longer speaks becomes the default locale.
 *
 * **The seams.** `StorageAdapter` is one `read` and one `write`. The browser
 * adapter wraps `localStorage` and swallows its errors (a full disk, a blocked
 * third-party context); `createMemoryStorage` is the in-memory fake the node
 * tests use. Nothing in this module touches `window` at import time.
 *
 * Pure: no session import, no DOM at module scope, no side effects.
 */

import { DEFAULT_LOCALE, isLocale, type Locale } from '$lib/i18n/locale';

/** The shape of the one stored value. A new shape means a new version. */
export const PERSIST_VERSION = 1;

/** The one storage key. One key keeps a version migration a single read. */
export const STORAGE_KEY = 'solar-system.persisted';

export type Persisted = {
	version: typeof PERSIST_VERSION;
	activityId: string | null;
	locale: Locale;
	trueDistance: boolean;
	trueSize: boolean;
};

/** The four session fields the app remembers. */
export type PersistedSource = {
	activityId: string | null;
	locale: Locale;
	trueDistance: boolean;
	trueSize: boolean;
	readonly [key: string]: unknown;
};

/** What a first visit, or an unreadable value, starts from. */
export const DEFAULT_PERSISTED: Persisted = {
	version: PERSIST_VERSION,
	activityId: null,
	locale: DEFAULT_LOCALE,
	trueDistance: false,
	trueSize: false
};

/** The thin storage seam: `localStorage` in the browser, a fake in the tests. */
export type StorageAdapter = {
	read(): string | null;
	write(raw: string): void;
};

/** A predicate answering whether an activity id is still in the registry. */
export type KnownActivity = (id: string) => boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The state a session should remember, taken by value from the four fields. */
export function fromSession(state: PersistedSource): Persisted {
	return {
		version: PERSIST_VERSION,
		activityId: state.activityId,
		locale: state.locale,
		trueDistance: state.trueDistance,
		trueSize: state.trueSize
	};
}

/** The stored string. Only the four remembered fields are written. */
export function encode(state: Persisted): string {
	return JSON.stringify({
		version: PERSIST_VERSION,
		activityId: state.activityId,
		locale: state.locale,
		trueDistance: state.trueDistance,
		trueSize: state.trueSize
	});
}

/**
 * The stored string back to a usable state. Never throws: every unreadable
 * value is a first visit, and every unreadable field is its default.
 *
 * `isKnownActivity` is how a caller (the page) tells the module which activity
 * ids still exist; without it an id is taken as written, which is what a pure
 * decode of a value with no registry can do.
 */
export function decode(raw: string | null, isKnownActivity?: KnownActivity): Persisted {
	if (raw === null || raw.trim() === '') return DEFAULT_PERSISTED;
	return parsePersisted(raw, isKnownActivity) ?? DEFAULT_PERSISTED;
}

/** The parse itself: `null` means "not a value this build can trust". */
function parsePersisted(raw: string, isKnownActivity?: KnownActivity): Persisted | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isRecord(parsed) || parsed.version !== PERSIST_VERSION) {
		return null;
	}

	const activityId =
		typeof parsed.activityId === 'string' &&
		parsed.activityId !== '' &&
		(isKnownActivity === undefined || isKnownActivity(parsed.activityId))
			? parsed.activityId
			: null;

	return {
		version: PERSIST_VERSION,
		activityId,
		locale: isLocale(parsed.locale) ? parsed.locale : DEFAULT_PERSISTED.locale,
		trueDistance:
			typeof parsed.trueDistance === 'boolean'
				? parsed.trueDistance
				: DEFAULT_PERSISTED.trueDistance,
		trueSize:
			typeof parsed.trueSize === 'boolean' ? parsed.trueSize : DEFAULT_PERSISTED.trueSize
	};
}

/**
 * The remembered state, or `null` when this is a first visit.
 *
 * The difference matters for the device language: a stored locale wins over the
 * device's, but *nothing stored* means the device language decides, exactly as
 * on a first visit (ticket 02's rule). `decode` alone cannot tell those two
 * apart, because both end up at the default locale.
 */
export function readStored(
	storage: StorageAdapter,
	isKnownActivity?: KnownActivity
): Persisted | null {
	let raw: string | null;

	try {
		raw = storage.read();
	} catch {
		return null;
	}

	if (raw === null || raw.trim() === '') return null;
	return parsePersisted(raw, isKnownActivity);
}

/** Read the remembered state through an adapter, falling back safely. */
export function readState(storage: StorageAdapter, isKnownActivity?: KnownActivity): Persisted {
	let raw: string | null = null;

	try {
		raw = storage.read();
	} catch {
		// A storage that refuses to be read is a storage with nothing in it.
		return DEFAULT_PERSISTED;
	}

	return decode(raw, isKnownActivity);
}

/** Write the remembered state through an adapter; a refusal is not an error. */
export function writeState(storage: StorageAdapter, state: Persisted): void {
	try {
		storage.write(encode(state));
	} catch {
		// Private modes and full disks refuse writes. The app still works, it
		// just forgets; remembering is never worth a broken tap.
	}
}

/** The in-memory fake the node tests run against. */
export function createMemoryStorage(initial: string | null = null): StorageAdapter & {
	readonly raw: string | null;
} {
	let value = initial;

	return {
		read(): string | null {
			return value;
		},
		write(raw: string): void {
			value = raw;
		},
		get raw(): string | null {
			return value;
		}
	};
}

/** `localStorage` behind the seam; a no-op adapter when the browser refuses it. */
export function createBrowserStorage(): StorageAdapter {
	function store(): Storage | null {
		try {
			return typeof localStorage === 'undefined' ? null : localStorage;
		} catch {
			return null;
		}
	}

	return {
		read(): string | null {
			return store()?.getItem(STORAGE_KEY) ?? null;
		},
		write(raw: string): void {
			store()?.setItem(STORAGE_KEY, raw);
		}
	};
}
