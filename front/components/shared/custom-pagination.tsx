'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CustomPaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  siblingsCount?: number;
}

export default function CustomPagination({
  totalPages,
  currentPage,
  onPageChange,
  siblingsCount = 1,
}: CustomPaginationProps) {
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);

  const generatePages = () => {
    const items: (number | 'ellipsis')[] = [];

    items.push(1);

    if (currentPage > siblingsCount + 2) {
      items.push('ellipsis');
    }

    for (
      let i = Math.max(2, currentPage - siblingsCount);
      i <= Math.min(totalPages - 1, currentPage + siblingsCount);
      i++
    ) {
      items.push(i);
    }

    if (currentPage < totalPages - siblingsCount - 1) {
      items.push('ellipsis');
    }

    if (totalPages > 1) {
      items.push(totalPages);
    }

    return [...new Set(items)];
  };

  const pages = generatePages();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text=""
            onClick={() => currentPage > 1 && onPageChange(prevPage)}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {pages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <PaginationItem key={`e-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={currentPage === page}
                onClick={() => onPageChange(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            text=""
            onClick={() => currentPage < totalPages && onPageChange(nextPage)}
            className={
              currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
