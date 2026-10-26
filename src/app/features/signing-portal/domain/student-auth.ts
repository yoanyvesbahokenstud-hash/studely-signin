import { Student } from './signing';

/**
 * Port de la session de l'étudiant qui signe. Distincte de la session du gestionnaire :
 * son `id_token` (rôle `ROLE_STUDENT`) est exigé par le service OTP.
 */
export abstract class StudentAuth {
  abstract student(): Student | null;

  /** Lève une `AppError` si les identifiants sont refusés ou si le compte n'est pas étudiant. */
  abstract signIn(email: string, password: string): Promise<Student>;

  /** `id_token` à transmettre pour l'OTP, `null` si la session est absente ou expirée. */
  abstract idToken(): string | null;

  abstract signOut(): void;
}
