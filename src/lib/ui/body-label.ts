/** The message key naming a body, so a component never builds one by hand. */
import type { MessageKey } from '$lib/i18n/messages';
import type { BodyId } from '$lib/session';

export const BODY_LABEL_KEY: Record<BodyId, MessageKey> = {
	sun: 'body.sun',
	earth: 'body.earth',
	moon: 'body.moon'
};
