import { Injectable } from '@angular/core';
import { Student } from '../../domain/signing';
import { StudentAuth } from '../../domain/student-auth';

/** Session étudiante simulée (mode mock) : n'importe quels identifiants sont acceptés. */
@Injectable()
export class DevStudentAuth extends StudentAuth {
  private current: Student | null = null;

  student(): Student | null {
    return this.current;
  }

  signIn(email: string): Promise<Student> {
    this.current = { email };
    return Promise.resolve(this.current);
  }

  idToken(): string | null {
    return this.current ? 'dev-student-token' : null;
  }

  signOut(): void {
    this.current = null;
  }
}
