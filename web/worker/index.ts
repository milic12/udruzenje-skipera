// Contact form handler. Static pages are served from ./dist by the assets layer; this Worker only
// runs for requests that match no static file (POST /api/contact, plus 404 fallthrough).
//
// Flow: honeypot -> Turnstile siteverify (success + action + hostname, fail closed) ->
// field validation -> env.EMAIL.send() via Email Routing to the verified destination address.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_ACTIONS = new Set(['contact', 'membership']);
const SUBJECT_PREFIX: Record<string, string> = { contact: 'Kontakt', membership: 'Članstvo' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 100, email: 254, message: 5000 };

type ErrorCode = 'validation' | 'captcha' | 'send' | 'not_found' | 'method';

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/api/contact') {
			if (request.method !== 'POST') return fail('method', 405, { Allow: 'POST' });
			return handleContact(request, env);
		}
		if (url.pathname.startsWith('/api/')) return fail('not_found', 404);

		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;

async function handleContact(request: Request, env: Env): Promise<Response> {
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return fail('validation', 400);
	}

	const field = (name: string) => {
		const value = form.get(name);
		return typeof value === 'string' ? value.trim() : '';
	};

	// Honeypot: real users never see or fill this field. Pretend success, send nothing.
	if (field('website')) {
		log('info', 'honeypot_triggered');
		return Response.json({ ok: true });
	}

	const source = field('source');
	if (!ALLOWED_ACTIONS.has(source)) return fail('validation', 400);

	// --- Turnstile (fail closed) ---
	const token = form.get('cf-turnstile-response');
	const hostnames = new Set(
		(env.TURNSTILE_HOSTNAMES ?? '')
			.split(',')
			.map((h) => h.trim())
			.filter(Boolean),
	);
	if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
		return fail('captcha', 403);
	}
	if (!env.TURNSTILE_SECRET || hostnames.size === 0) {
		log('error', 'turnstile_not_configured');
		return fail('captcha', 403);
	}

	let verify: { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };
	try {
		const res = await fetch(SITEVERIFY_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({
				secret: env.TURNSTILE_SECRET,
				response: token,
				remoteip: request.headers.get('CF-Connecting-IP') ?? '',
			}),
		});
		if (!res.ok) throw new Error(`siteverify ${res.status}`);
		verify = await res.json();
	} catch (err) {
		log('error', 'turnstile_request_failed', { error: String(err) });
		return fail('captcha', 403);
	}

	if (verify.success !== true || verify.action !== source || !hostnames.has(verify.hostname ?? '')) {
		log('warn', 'turnstile_rejected', {
			errorCodes: verify['error-codes'],
			action: verify.action,
			hostname: verify.hostname,
		});
		return fail('captcha', 403);
	}

	// --- Field validation ---
	const firstName = field('firstName');
	const lastName = field('lastName');
	const email = field('email');
	const message = field('message');

	if (
		!EMAIL_RE.test(email) ||
		email.length > LIMITS.email ||
		!message ||
		message.length > LIMITS.message ||
		firstName.length > LIMITS.name ||
		lastName.length > LIMITS.name
	) {
		return fail('validation', 400);
	}

	// --- Send ---
	if (!env.EMAIL || !env.CONTACT_FROM || !env.CONTACT_TO) {
		log('error', 'email_not_configured');
		return fail('send', 500);
	}

	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	const prefix = SUBJECT_PREFIX[source];
	// Strip CR/LF so user input can never inject extra headers via the subject.
	const subject = `[${prefix}] Poruka od ${fullName || email}`.replace(/[\r\n]+/g, ' ');

	const text = [
		`Nova poruka sa web forme (${prefix}).`,
		'',
		`Ime: ${fullName || '-'}`,
		`E-mail: ${email}`,
		'',
		'Poruka:',
		message,
	].join('\n');

	const html = `<p>Nova poruka sa web forme (<strong>${escapeHtml(prefix)}</strong>).</p>
<table cellpadding="4">
<tr><td><strong>Ime:</strong></td><td>${escapeHtml(fullName || '-')}</td></tr>
<tr><td><strong>E-mail:</strong></td><td>${escapeHtml(email)}</td></tr>
</table>
<p><strong>Poruka:</strong></p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

	try {
		const result = await env.EMAIL.send({
			from: { email: env.CONTACT_FROM, name: 'Udruženje skipera – web forma' },
			to: env.CONTACT_TO,
			replyTo: fullName ? { email, name: fullName } : email,
			subject,
			text,
			html,
		});
		log('info', 'email_sent', { messageId: result.messageId, source });
		return Response.json({ ok: true });
	} catch (err) {
		log('error', 'email_send_failed', { error: String(err) });
		return fail('send', 500);
	}
}

function fail(error: ErrorCode, status: number, headers?: HeadersInit): Response {
	return Response.json({ ok: false, error }, { status, headers });
}

function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
	console[level](JSON.stringify({ level, event, ...data }));
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
