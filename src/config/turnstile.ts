// Turnstile configuration
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

if (!TURNSTILE_SITE_KEY) {
  console.warn('NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. CAPTCHA will not work properly.');
}