import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "../../assets/icons";
import CustomDropdown from "../CustomDropdown";
import { useLanguage } from "../../i18n";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [5, 8, 10, 20],
  className = "",
}) => {
  const { t } = useLanguage();
  const showPageSizeControl = typeof onPageSizeChange === "function";
  const normalizedPageSizeOptions = pageSizeOptions.map((option) => ({
    value: String(option),
    label: `${option} / ${t("paginationPageUnit")}`,
  }));

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      {showPageSizeControl ? (
        <div className="w-full min-w-[150px] flex-1 sm:max-w-[180px]">
          <CustomDropdown
            id="pagination-page-size"
            name="pagination-page-size"
            label={t("paginationPageSize")}
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            options={normalizedPageSizeOptions}
            placeholder={t("paginationSelectSize")}
            menuPlacement="top"
          />
        </div>
      ) : <div />}

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-primary transition-colors"
          title="First Page"
        >
          <ChevronsLeft size={20} />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-primary transition-colors"
          title="Previous Page"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex flex-wrap items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === "..." ? (
                <span className="px-3 py-2 text-gray-400">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold transition-all duration-200 ${
                    currentPage === page
                      ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                      : "text-gray-600 hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-primary transition-colors"
          title="Next Page"
        >
          <ChevronRight size={20} />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-primary transition-colors"
          title="Last Page"
        >
          <ChevronsRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
