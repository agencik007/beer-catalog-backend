// Allowed frontend origins: local dev (CRA/Vite) or comma-separated list in CORS_ORIGINS
const defaultAllowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

export const getAllowedOrigins = (): string[] => {
	const fromEnv = (process.env.CORS_ORIGINS || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return fromEnv.length ? fromEnv : defaultAllowedOrigins;
};
