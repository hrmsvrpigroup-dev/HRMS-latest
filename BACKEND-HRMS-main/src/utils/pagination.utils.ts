export type PaginationMeta = {
  page: number
  pageSize: number
  skip: number
}

export const getPagination = (page?: string, pageSize?: string): PaginationMeta => {
  const safePage = Math.max(1, Number(page ?? 1))
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize ?? 20)))

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
  }
}

