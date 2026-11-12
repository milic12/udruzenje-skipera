import { mountTurnstile, type TurnstileWidget } from './turnstile';

export type FormMessages = {
	sending: string;
	captcha: string;
	validation: string;
	error: string;
};

const DEFAULT_MESSAGES: FormMessages = {
	sending: 'Šalje se…',
	captcha: 'Provjera nije uspjela. Sačekajte trenutak i pokušajte ponovo.',
	validation: 'Provjerite unesene podatke.',
	error: 'Došlo je do greške. Pokušajte ponovo ili nam pišite direktno na e-mail.',
};

/**
 * Wire a Turnstile-protected form inside `root`: mounts the widget, POSTs the form to its
 * `action` via fetch, shows status/success, and resets the single-use token after each attempt.
 *
 * Expected markup inside `root`: `form`, `[data-turnstile]` (from `Turnstile.astro`),
 * `[data-status]`, `button[type="submit"]`, `[data-success]`, `[data-success-heading]`,
 * and optionally `[data-send-again]`.
 */
export async function setupProtectedForm(root: HTMLElement, messages: Partial<FormMessages> = {}) {
	const text = { ...DEFAULT_MESSAGES, ...messages };

	const form = root.querySelector<HTMLFormElement>('form');
	const container = root.querySelector<HTMLElement>('[data-turnstile]');
	const status = root.querySelector<HTMLElement>('[data-status]');
	const button = root.querySelector<HTMLButtonElement>('button[type="submit"]');
	const success = root.querySelector<HTMLElement>('[data-success]');
	const successHeading = root.querySelector<HTMLElement>('[data-success-heading]');
	const sendAgain = root.querySelector<HTMLButtonElement>('[data-send-again]');
	if (!form || !container || !status || !button || !success || !successHeading) return;

	const setStatus = (message: string, tone: 'info' | 'error') => {
		status.textContent = message;
		status.classList.toggle('text-error', tone === 'error');
		status.classList.toggle('text-muted', tone === 'info');
	};

	const showSuccess = () => {
		form.hidden = true;
		success.hidden = false;
		successHeading.focus();
	};

	sendAgain?.addEventListener('click', () => {
		setStatus('', 'info');
		success.hidden = true;
		form.hidden = false;
		form.querySelector<HTMLElement>('input:not([type="hidden"]):not([tabindex="-1"])')?.focus();
	});

	let widget: TurnstileWidget | undefined;
	try {
		widget = await mountTurnstile(container);
	} catch {
		setStatus(text.captcha, 'error');
	}

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!form.reportValidity()) return;

		if (!widget || !widget.getToken()) {
			setStatus(text.captcha, 'error');
			return;
		}

		const label = button.textContent;
		button.disabled = true;
		button.textContent = text.sending;
		setStatus('', 'info');

		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { Accept: 'application/json' },
			});
			const data: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));

			if (res.ok && data.ok) {
				form.reset();
				showSuccess();
			} else if (data.error === 'captcha') {
				setStatus(text.captcha, 'error');
			} else if (data.error === 'validation') {
				setStatus(text.validation, 'error');
			} else {
				setStatus(text.error, 'error');
			}
		} catch {
			setStatus(text.error, 'error');
		} finally {
			// Turnstile tokens are single-use: always get a fresh one for the next attempt.
			widget.reset();
			button.disabled = false;
			button.textContent = label;
		}
	});
}
