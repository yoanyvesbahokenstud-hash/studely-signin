/** Enveloppes de réponse du backend (`ObjectViewModel`, `PageViewModel`). */
export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface ApiPageMetadata {
  totalResults: number;
  totalPages: number;
  pageNumber: number;
  size: number;
  maxPerPage: number;
}

export interface ApiPage<T> {
  status: number;
  message: string;
  data: T[];
  metadata: ApiPageMetadata;
}
