import { TestBed } from '@angular/core/testing';
import { InMemorySignatureRequestRepository } from './in-memory-signature-request.repository';

const signer = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+33612345678',
};

/** L'adaptateur en mémoire doit refuser ce que le backend refuse, avec les mêmes codes. */
describe('InMemorySignatureRequestRepository', () => {
  let repository: InMemorySignatureRequestRepository;
  let id: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [InMemorySignatureRequestRepository] });
    repository = TestBed.inject(InMemorySignatureRequestRepository);
    id = await repository.create();
  });

  async function draftWithSigner(): Promise<string> {
    await repository.uploadDocuments(id, [new File(['%PDF'], 'bail.pdf')]);
    await repository.addSigner(id, signer);
    const request = await repository.findById(id);
    return request!.signers[0].id;
  }

  it('requires a document before adding a signer (400_415)', async () => {
    await expect(repository.addSigner(id, signer)).rejects.toMatchObject({ code: '400_415' });
  });

  it('refuses two signers with the same email, whatever the case (400_413)', async () => {
    await draftWithSigner();
    await expect(
      repository.addSigner(id, { ...signer, email: 'ADA@example.com' }),
    ).rejects.toMatchObject({ code: '400_413' });
  });

  it('lets a signer keep its own email when edited', async () => {
    const signerId = await draftWithSigner();
    await repository.editSigner(id, signerId, { ...signer, firstName: 'Augusta' });

    expect((await repository.findById(id))!.signers[0].firstName).toBe('Augusta');
  });

  it('marks a signer PENDING once it has a field, UNUSED again without', async () => {
    const signerId = await draftWithSigner();
    const documentId = (await repository.findById(id))!.documents[0].id;

    await repository.addField(id, { signerId, documentId, tag: 's1' });
    let request = (await repository.findById(id))!;
    expect(request.signers[0].status).toBe('PENDING');

    await repository.removeField(id, request.signers[0].fields[0].id);
    request = (await repository.findById(id))!;
    expect(request.signers[0].status).toBe('UNUSED');
  });

  it('refuses the same tag twice on a document (400_422)', async () => {
    const signerId = await draftWithSigner();
    const documentId = (await repository.findById(id))!.documents[0].id;
    await repository.addField(id, { signerId, documentId, tag: 's1' });

    await expect(
      repository.addField(id, { signerId, documentId, tag: 's1' }),
    ).rejects.toMatchObject({
      code: '400_422',
    });
  });

  it('refuses to submit an incomplete draft, then freezes the submitted request', async () => {
    const signerId = await draftWithSigner();
    await expect(repository.submit(id)).rejects.toMatchObject({ code: '400_432' });

    const documentId = (await repository.findById(id))!.documents[0].id;
    await repository.addField(id, { signerId, documentId, tag: 's1' });
    await repository.submit(id);

    expect((await repository.findById(id))!.state).toBe('SUBMITTED');
    await expect(
      repository.addFollower(id, { email: 'f@example.com', phone: '+33600000000' }),
    ).rejects.toMatchObject({
      code: '400_400',
    });
  });

  it('only cancels a submitted request (400_401)', async () => {
    await expect(repository.cancel(id)).rejects.toMatchObject({ code: '400_401' });
  });
});
