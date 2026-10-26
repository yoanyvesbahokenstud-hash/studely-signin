import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiPage, ApiResponse } from '@core/http/api-envelope';
import { Page, PageRequest } from '@shared/domain/page';
import {
  DocumentLink,
  FieldInput,
  FollowerInput,
  GeneralInformation,
  SignatureRequest,
  SignatureRequestSearchCriteria,
  SignerInput,
} from '../../domain/signature-request';
import { SignatureRequestRepository } from '../../domain/signature-request.repository';
import {
  GetDocumentFilesResultDto,
  InitSignatureRequestResultDto,
  SearchSignatureRequestResultDto,
} from './signature-request.dto';
import { toSignatureRequest } from './signature-request.mapper';

/** Adaptateur vers `/api/v1/bo/signature-request` (voir Swagger : `/swagger-ui.html`). */
@Injectable()
export class HttpSignatureRequestRepository extends SignatureRequestRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiBaseUrl}/bo/signature-request`;

  /** `GET /search` */
  async search(
    criteria: SignatureRequestSearchCriteria,
    page: PageRequest,
  ): Promise<Page<SignatureRequest>> {
    let params = new HttpParams().set('page', page.page).set('size', page.size);
    if (criteria.id) params = params.set('idSignatureRequest', criteria.id);
    if (criteria.name) params = params.set('requestName', criteria.name);
    if (criteria.state) params = params.set('requestState', criteria.state);
    if (criteria.createdFrom)
      params = params.set('createdAtFrom', criteria.createdFrom.toISOString());
    if (criteria.createdTo) params = params.set('createdAtTo', criteria.createdTo.toISOString());

    const response = await firstValueFrom(
      this.http.get<ApiPage<SearchSignatureRequestResultDto>>(`${this.baseUrl}/search`, { params }),
    );
    return {
      items: response.data.map(toSignatureRequest),
      totalItems: response.metadata.totalResults,
      totalPages: response.metadata.totalPages,
      page: response.metadata.pageNumber,
      size: response.metadata.size,
    };
  }

  /** Pas d'endpoint dédié : `GET /search?idSignatureRequest=`. */
  async findById(id: string): Promise<SignatureRequest | null> {
    const result = await this.search({ id }, { page: 0, size: 1 });
    return result.items[0] ?? null;
  }

  /** `POST /init` */
  async create(): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<InitSignatureRequestResultDto>>(`${this.baseUrl}/init`, null),
    );
    return response.data.idSignatureRequest;
  }

  /** `PATCH /edit-information` */
  editInformation(requestId: string, information: GeneralInformation): Promise<void> {
    return this.send(
      this.http.patch(`${this.baseUrl}/edit-information`, {
        idSignatureRequest: requestId,
        requestName: information.name,
        linkExpirationTimeInDays: information.linkValidityDays,
        reminderTimes: information.reminderTimes,
      }),
    );
  }

  /** `POST /upload-document` (multipart : `idSignatureRequest` + `files` répété). */
  uploadDocuments(requestId: string, files: File[]): Promise<void> {
    const form = new FormData();
    form.append('idSignatureRequest', requestId);
    files.forEach((file) => form.append('files', file, file.name));
    return this.send(this.http.post(`${this.baseUrl}/upload-document`, form));
  }

  /** `DELETE /remove-document` */
  removeDocuments(requestId: string, documentIds: string[]): Promise<void> {
    return this.send(
      this.http.delete(`${this.baseUrl}/remove-document`, {
        body: { idSignatureRequest: requestId, idDocuments: documentIds },
      }),
    );
  }

  /** `GET /{id}/documents` */
  async documentLinks(requestId: string): Promise<DocumentLink[]> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<GetDocumentFilesResultDto>>(
        `${this.baseUrl}/${encodeURIComponent(requestId)}/documents`,
      ),
    );
    return response.data.documents.map((document) => ({
      documentId: document.idDocument,
      fileName: document.fileName,
      url: document.downloadUrl,
      signedUrl: document.downloadUrlSignedFile ?? undefined,
    }));
  }

  /** `POST /add-signer` */
  addSigner(requestId: string, signer: SignerInput): Promise<void> {
    return this.send(
      this.http.post(`${this.baseUrl}/add-signer`, {
        idSignatureRequest: requestId,
        firstname: signer.firstName || null,
        lastname: signer.lastName,
        email: signer.email,
        phone: signer.phone,
      }),
    );
  }

  /** `PATCH /edit-signer` (tous les champs sont obligatoires côté backend). */
  editSigner(requestId: string, signerId: string, signer: SignerInput): Promise<void> {
    return this.send(
      this.http.patch(`${this.baseUrl}/edit-signer`, {
        idSignatureRequest: requestId,
        idSigner: signerId,
        newFirstName: signer.firstName,
        newLastName: signer.lastName,
        newEmail: signer.email,
        newPhoneNumber: signer.phone,
      }),
    );
  }

  /** `DELETE /remove-signer` */
  removeSigner(requestId: string, signerId: string): Promise<void> {
    return this.send(
      this.http.delete(`${this.baseUrl}/remove-signer`, {
        body: { idSignatureRequest: requestId, idSigner: signerId },
      }),
    );
  }

  /** `POST /add-field` */
  addField(requestId: string, field: FieldInput): Promise<void> {
    return this.send(
      this.http.post(`${this.baseUrl}/add-field`, {
        idSignatureRequest: requestId,
        idSigner: field.signerId,
        tag: field.tag,
        documentReference: field.documentId,
      }),
    );
  }

  /** `DELETE /remove-field` */
  removeField(requestId: string, fieldId: string): Promise<void> {
    return this.send(
      this.http.delete(`${this.baseUrl}/remove-field`, {
        body: { idSignatureRequest: requestId, idField: fieldId },
      }),
    );
  }

  /** `POST /add-follower` — attention, la clé de l'identifiant prend un `I` majuscule. */
  addFollower(requestId: string, follower: FollowerInput): Promise<void> {
    return this.send(
      this.http.post(`${this.baseUrl}/add-follower`, {
        IdSignatureRequest: requestId,
        email: follower.email,
        phone: follower.phone,
      }),
    );
  }

  /** `PATCH /edit-follower` */
  editFollower(requestId: string, followerId: string, follower: FollowerInput): Promise<void> {
    return this.send(
      this.http.patch(`${this.baseUrl}/edit-follower`, {
        idSignatureRequest: requestId,
        idFollower: followerId,
        newEmail: follower.email,
        newPhone: follower.phone,
      }),
    );
  }

  /** `DELETE /remove-follower` */
  removeFollower(requestId: string, followerId: string): Promise<void> {
    return this.send(
      this.http.delete(`${this.baseUrl}/remove-follower`, {
        body: { idSignatureRequest: requestId, idFollower: followerId },
      }),
    );
  }

  /** `PATCH /submit-request` */
  submit(requestId: string): Promise<void> {
    return this.send(
      this.http.patch(`${this.baseUrl}/submit-request`, { idSignatureRequest: requestId }),
    );
  }

  /** `POST /{id}/cancel-request` */
  cancel(requestId: string): Promise<void> {
    return this.send(
      this.http.post(`${this.baseUrl}/${encodeURIComponent(requestId)}/cancel-request`, null),
    );
  }

  private async send(request: Observable<unknown>): Promise<void> {
    await firstValueFrom(request);
  }
}
