import { Resend } from 'resend';

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	/** Plain link included in the email, logged in dev when no provider is configured. */
	link?: string;
}

let resend: Resend | null = null;

const getResend = () => {
	if (!process.env.RESEND_API_KEY) return null;
	resend ??= new Resend(process.env.RESEND_API_KEY);
	return resend;
};

export const sendEmail = async ({ to, subject, html, link }: SendEmailOptions) => {
	const client = getResend();

	if (!client) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error('RESEND_API_KEY is not set, cannot send emails.');
		}
		console.log(`[email:dev] To: ${to} | ${subject}${link ? ` | ${link}` : ''}`);
		return;
	}

	const { error } = await client.emails.send({
		from: process.env.EMAIL_FROM || 'Beer Catalog <onboarding@resend.dev>',
		to,
		subject,
		html,
	});

	if (error) {
		console.error('[email] Failed to send email:', error);
		throw new Error(`Failed to send email: ${error.message}`);
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
