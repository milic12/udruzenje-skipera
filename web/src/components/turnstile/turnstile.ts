type TurnstileApi = {
	render: (el: HTMLElement, options: Record<string, unknown>) => string;
	reset: (widgetId: string) => void;
	getResponse: (widgetId: string) => string | undefined;
};

export type TurnstileWidget = {
	/** Current single-use token, or undefined if the challenge isn't solved yet. */
	getToken: () => string | undefined;
	/** Request a fresh token. Call after every submit attempt. */
	reset: () => void;
};

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const getApi = () => (window as Window & { turnstile?: TurnstileApi }).turnstile;
let apiPromise: Promise<TurnstileApi> | undefined;

// Load Turnstile once, in explicit-render mode, so each widget keeps its own ID
// and its single-use token can be reset independently.
function loadTurnstile(): Promise<TurnstileApi> {
	const existing = getApi();
	if (existing) return Promise.resolve(existing);
	apiPromise ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = SCRIPT_SRC;
		script.async = true;
		script.onload = () => {
			const api = getApi();
			if (api) resolve(api);
			else reject(new Error('turnstile'));
		};
		script.onerror = () => reject(new Error('turnstile'));
		document.head.appendChild(script);
	});
	return apiPromise;
}

/**
 * Render a Turnstile widget into a container produced by `Turnstile.astro`
 * (reads `data-sitekey` and `data-action`). Rejects if the script fails to load.
 */
export async function mountTurnstile(container: HTMLElement): Promise<TurnstileWidget> {
	const api = await loadTurnstile();
	const widgetId = api.render(container, {
		sitekey: container.dataset.sitekey,
		action: container.dataset.action,
	});
	return {
		getToken: () => api.getResponse(widgetId),
		reset: () => api.reset(widgetId),
	};
}
