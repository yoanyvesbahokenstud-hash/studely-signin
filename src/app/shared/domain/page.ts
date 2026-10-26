export interface PageRequest {
  page: number;
  size: number;
}

export interface Page<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  page: number;
  size: number;
}

export function emptyPage<T>(request: PageRequest): Page<T> {
  return { items: [], totalItems: 0, totalPages: 0, page: request.page, size: request.size };
}
