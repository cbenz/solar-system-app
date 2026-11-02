import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PERSISTED,
	PERSIST_VERSION,
	STORAGE_KEY,
	createMemoryStorage,
	decode,
	encode,
	fromSession,
	readState,
	readStored,
	writeState,
	type Persisted
} from './storage';

/** The only ids the fake registry knows: `day-and-night` exists, `gone` does not. */
const isKnownActivity = (id: string): boolean => id === 'day-and-night';

const saved: Persisted = {
	version: PERSIST_VERSION,
	activityId: 'day-and-night',
	locale: 'fr',
	trueDistance: true,
	trueSize: false
};

describe('the persistence module', () => {
	it('round-trips through encode and decode', () => {
		expect(decode(encode(saved), isKnownActivity)).toEqual(saved);
	});

	it('persists exactly four state fields, and the version beside them', () => {
		const payload = JSON.parse(encode(saved)) as Record<string, unknown>;

		// A later ticket that adds a state field must opt into persisting it; this
		// assertion is what stops a field from starting to be stored silently.
		expect(Object.keys(payload).sort()).toEqual([
			'activityId',
			'locale',
			'trueDistance',
			'trueSize',
			'version'
		]);
	});

	it('takes those four fields from a session and ignores the rest', () => {
		const persisted = fromSession({
			activityId: 'day-and-night',
			locale: 'fr',
			trueDistance: true,
			trueSize: false,
			// Everything below is session state that must never be stored.
			mode: 'activity',
			phase: 'mission',
			guideStep: 2,
			instant: 1_700_000_000_000,
			camera: { distance: 4, pitch: 0.2 },
			observers: [{ id: 'pov-1', latitudeDeg: 48.8 }],
			settings: { playbackSpeed: 3 },
			mission: { missionId: 'noon' }
		});

		expect(persisted).toEqual(saved);
		expect(JSON.parse(encode(persisted))).toEqual({
			version: PERSIST_VERSION,
			activityId: 'day-and-night',
			locale: 'fr',
			trueDistance: true,
			trueSize: false
		});
	});

	it('falls back to the defaults on a null or empty value', () => {
		expect(decode(null)).toEqual(DEFAULT_PERSISTED);
		expect(decode('')).toEqual(DEFAULT_PERSISTED);
	});

	it('falls back to the defaults on corrupt JSON, never throwing', () => {
		expect(() => decode('{not json')).not.toThrow();
		expect(decode('{not json')).toEqual(DEFAULT_PERSISTED);
		expect(decode('"a string"')).toEqual(DEFAULT_PERSISTED);
		expect(decode('[1,2,3]')).toEqual(DEFAULT_PERSISTED);
	});

	it('falls back to the defaults on an unknown version', () => {
		const future = JSON.stringify({ ...saved, version: 2 });

		expect(decode(future)).toEqual(DEFAULT_PERSISTED);
		expect(decode(JSON.stringify({ ...saved, version: undefined }))).toEqual(DEFAULT_PERSISTED);
	});

	it('drops an activity id the registry no longer holds, keeping the rest', () => {
		const persisted = decode(JSON.stringify({ ...saved, activityId: 'gone' }), isKnownActivity);

		expect(persisted.activityId).toBeNull();
		expect(persisted.locale).toBe('fr');
		expect(persisted.trueDistance).toBe(true);
	});

	it('drops a locale the app no longer speaks, keeping the rest', () => {
		const persisted = decode(JSON.stringify({ ...saved, locale: 'de' }));

		expect(persisted.locale).toBe(DEFAULT_PERSISTED.locale);
		expect(persisted.activityId).toBe('day-and-night');
		expect(persisted.trueDistance).toBe(true);
	});

	it('falls back field by field when a value has the wrong shape', () => {
		const persisted = decode(
			JSON.stringify({
				version: PERSIST_VERSION,
				activityId: 42,
				locale: 'fr',
				trueDistance: 'yes',
				trueSize: true
			})
		);

		expect(persisted.activityId).toBeNull();
		expect(persisted.trueDistance).toBe(false);
		expect(persisted.trueSize).toBe(true);
		expect(persisted.locale).toBe('fr');
	});

	it('tells a first visit apart from a stored value, so the device language wins there', () => {
		const firstVisit = createMemoryStorage();

		expect(readStored(firstVisit)).toBeNull();

		writeState(firstVisit, saved);

		expect(readStored(firstVisit, isKnownActivity)).toEqual(saved);

		const unreadable = createMemoryStorage('{broken');

		expect(readStored(unreadable)).toBeNull();
	});

	it('reads and writes through an injectable adapter', () => {
		const storage = createMemoryStorage();

		expect(readState(storage)).toEqual(DEFAULT_PERSISTED);

		writeState(storage, saved);

		expect(storage.raw).toBe(encode(saved));
		expect(readState(storage, isKnownActivity)).toEqual(saved);
	});

	it('keeps its one key, so a version bump can be migrated instead of guessed', () => {
		expect(STORAGE_KEY).toBe('solar-system.persisted');
		expect(PERSIST_VERSION).toBe(1);
	});
});
