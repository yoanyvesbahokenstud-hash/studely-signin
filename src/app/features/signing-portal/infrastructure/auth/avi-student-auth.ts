import { DestroyRef, inject, Injectable } from '@angular/core';
import { AuthUser } from '@core/auth/auth-user';
import { AviAuthClient } from '@core/auth/avi-auth-client';
import { TokenSession } from '@core/auth/token-session';
import { AppError } from '@shared/domain/app-error';
import { STUDENT_ROLE, Student } from '../../domain/signing';
import { StudentAuth } from '../../domain/student-auth';

/** Code levé quand le compte n'a pas le rôle étudiant exigé par le service OTP. */
export const NOT_A_STUDENT_ERROR_CODE = 'NOT_A_STUDENT';

const isStudent = (user: AuthUser) => user.authorities.includes(STUDENT_ROLE);

/** Session étudiante ouverte auprès du service d'auth AVI, séparée de celle du back-office. */
@Injectable()
export class AviStudentAuth extends StudentAuth {
  private readonly client = inject(AviAuthClient);
  private readonly session = new TokenSession('sts.signer-session', isStudent);

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.session.dispose());
  }

  student(): Student | null {
    const user = this.session.user();
    return user ? { email: user.email } : null;
  }

  async signIn(email: string, password: string): Promise<Student> {
    const { token, user } = await this.client.signIn(email, password);
    if (!isStudent(user)) {
      throw new AppError(403, NOT_A_STUDENT_ERROR_CODE, 'This account is not a student account');
    }
    this.session.open(token, user);
    return { email: user.email };
  }

  idToken(): string | null {
    return this.session.token();
  }

  signOut(): void {
    this.session.close();
  }
}
