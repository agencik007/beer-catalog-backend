// Transactional emails via the Brevo HTTP API (https://developers.brevo.com/reference/send-transac-email)
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	/** Plain link included in the email, logged in dev when no provider is configured. */
	link?: string;
}

export const sendEmail = async ({ to, subject, html, link }: SendEmailOptions) => {
	const apiKey = process.env.BREVO_API_KEY;

	if (!apiKey) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error('BREVO_API_KEY is not set, cannot send emails.');
		}
		console.log(`[email:dev] To: ${to} | ${subject}${link ? ` | ${link}` : ''}`);
		return;
	}

	const senderEmail = process.env.EMAIL_FROM_ADDRESS;
	if (!senderEmail) {
		throw new Error('EMAIL_FROM_ADDRESS is not set (must be a sender verified in Brevo).');
	}

	const response = await fetch(BREVO_API_URL, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'content-type': 'application/json',
			'api-key': apiKey,
		},
		body: JSON.stringify({
			sender: {
				name: process.env.EMAIL_FROM_NAME || 'Beer Catalog',
				email: senderEmail,
			},
			to: [{ email: to }],
			subject,
			htmlContent: html,
			...(link ? { textContent: `${subject}\n\n${link}` } : {}),
		}),
		signal: AbortSignal.timeout(10_000),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Brevo responded with ${response.status}: ${body.slice(0, 300)}`);
	}
};

const escapeHtml = (value: string) =>
	value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const actionEmailHtml = (heading: string, text: string, url: string) => `
<div style="font-family:sans-serif;max-width:480px">
	<h2>${escapeHtml(heading)}</h2>
	<p>${escapeHtml(text)}</p>
	<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
</div>`;
