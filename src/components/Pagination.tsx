import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  totalItems: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  totalItems,
}) => {
  const { t } = useTranslation();

  const getPageNumbers = () => {
    const pages = [];
    const showMax = 5;

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1 && totalItems <= limit) {
    return (
       <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
          <p className="text-xs text-gray-500 font-medium italic">
            {t('common.pagination.showing_all', 'Mostrando todos los registros')} ({totalItems})
          </p>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('common.pagination.rows', 'Filas')}:</span>
             <select 
               value={limit}
               onChange={(e) => onLimitChange(Number(e.target.value))}
               className="bg-white border border-gray-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
             >
               {[5, 10, 20, 50, 100].map(v => (
                 <option key={v} value={v}>{v}</option>
               ))}
             </select>
          </div>
       </div>
    );
  }

  return (
    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <p className="text-xs text-gray-500 font-medium">
          <span className="text-gray-400 font-bold uppercase tracking-widest mr-1">{t('common.pagination.total_records', 'Total')}:</span> 
          <span className="text-gray-900 font-bold">{totalItems}</span>
        </p>
        
        <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('common.pagination.rows', 'Filas')}:</span>
          <select 
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-white border border-gray-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            {[5, 10, 20, 50, 100].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          title="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, i) => (
            p === '...' ? (
              <div key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                <MoreHorizontal className="w-4 h-4" />
              </div>
            ) : (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 border ${
                  currentPage === p
                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {p}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          title="Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
