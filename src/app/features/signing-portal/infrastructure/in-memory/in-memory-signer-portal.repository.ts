import { Injectable } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import { SigningLink, SigningOutcome, VerifiedLink } from '../../domain/signing';
import { SignerPortalRepository } from '../../domain/signer-portal.repository';
import { mockPdf } from '@core/mocks/mock-pdf';

/** Code OTP accepté par l'adaptateur en mémoire. */
export const MOCK_OTP = '123456';

interface MockSigner {
  email: string;
  verified: boolean;
  signed: boolean;
  failedAttempts: number;
}

/**
 * Adaptateur du mode mock. Lien valable : `/sign/req-2/s-2` (Noah Bernard, `noah.bernard@example.com`),
 * dernier signataire de la demande « Contrat de garantie ». Code OTP : `123456`.
 */
@Injectable()
export class InMemorySignerPortalRepository extends SignerPortalRepository {
  private readonly requests = new Map([
    [
      'req-2',
      {
        name: 'Contrat de garantie',
        signers: new Map<string, MockSigner>([
          [
            's-1',
            {
              email: 'camille.martin@example.com',
              verified: true,
              signed: true,
              failedAttempts: 0,
            },
          ],
          [
            's-2',
            {
              email: 'noah.bernard@example.com',
              verified: false,
              signed: false,
              failedAttempts: 0,
            },
          ],
        ]),
      },
    ],
  ]);
  private otpRequested = false;

  async verifyLink(link: SigningLink, email: string): Promise<VerifiedLink> {
    const signer = this.signer(link);
    if (signer.failedAttempts >= 5) {
      throw new AppError(400, '400_453', 'Signer: too many failed link verification attempts');
    }
    if (signer.email.toLowerCase() !== email.trim().toLowerCase()) {
      signer.failedAttempts++;
      throw new AppError(400, '400_454', 'Signer: provided email does not match');
    }
    signer.verified = true;
    signer.failedAttempts = 0;
    return {
      signerEmail: signer.email,
      documentUrls: [this.blobUrl(mockPdf('Contrat simule'))],
    };
  }

  async requestOtp(link: SigningLink): Promise<void> {
    const signer = this.signer(link);
    if (!signer.verified)
      throw new AppError(400, '400_440', 'SignatureRequest: signer link is not verified');
    this.otpRequested = true;
  }

  async sign(link: SigningLink, otp: string): Promise<SigningOutcome> {
    const signer = this.signer(link);
    if (signer.signed)
      throw new AppError(500, '500_400', 'Signer: cannot sign fields in current signer status');
    if (!signer.verified)
      throw new AppError(400, '400_440', 'SignatureRequest: signer link is not verified');
    if (!this.otpRequested || otp !== MOCK_OTP) {
      throw new AppError(400, '400_441', 'SignatureRequest: OTP does not match');
    }
    signer.signed = true;
    const request = this.requests.get(link.requestId)!;
    const completed = [...request.signers.values()].every((candidate) => candidate.signed);
    return {
      requestName: request.name,
      completed,
      signedDocumentUrls: completed ? [this.blobUrl(mockPdf('Contrat signe (simule)', 1))] : [],
    };
  }

  private signer(link: SigningLink): MockSigner {
    const request = this.requests.get(link.requestId);
    if (!request)
      throw new AppError(400, '400_460', 'SignatureRequest: signature request not found');
    const signer = request.signers.get(link.signerId);
    if (!signer) throw new AppError(400, '400_416', 'SignatureRequest: signer not found');
    return signer;
  }

  /** Les navigateurs bloquent l'ouverture d'une URL data: ; une URL blob passe. */
  private blobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
}
