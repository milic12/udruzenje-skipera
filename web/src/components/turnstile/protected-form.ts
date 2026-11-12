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

/** Small spinner shown next to the "sending" label; inherits the button's text color. */
function createSpinner(): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('class', 'mr-2 h-4 w-4 animate-spin');
	svg.innerHTML =
		'<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/>' +
		'<path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
	return svg;
}

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

		const original = [...button.childNodes];
		button.disabled = true;
		button.setAttribute('aria-busy', 'true');
		button.replaceChildren(createSpinner(), text.sending);
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
			button.removeAttribute('aria-busy');
			button.replaceChildren(...original);
		}
	});
}
