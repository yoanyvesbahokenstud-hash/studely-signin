import { AuthUser } from './auth-user';

/**
 * Lit les claims d'un `id_token` Cognito sans vérifier la signature :
 * c'est le backend qui vérifie le jeton, le front ne s'en sert que pour l'affichage et l'expiration.
 */
export function readIdToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1])) as Record<string, unknown>;
    const exp = payload['exp'];
    if (typeof exp !== 'number') {
      return null;
    }
    const authorities = payload['custom:authorities'];
    return {
      email: typeof payload['email'] === 'string' ? payload['email'] : '',
      authorities:
        typeof authorities === 'string'
          ? authorities
              .split(',')
              .map((role) => role.trim())
              .filter(Boolean)
          : [],
      expiresAt: new Date(exp * 1000),
    };
  } catch {
    return null;
  }
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
