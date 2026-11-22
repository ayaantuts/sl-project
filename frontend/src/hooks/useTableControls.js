import { useState } from 'react';

export function useTableControls(rows, { searchFields = [], initialSort = null, filters = {}, pageSize = 10 } = {}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(initialSort); // { field, direction: 'asc' | 'desc', getValue? }
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    let out = rows || [];
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
        out = out.filter((r) => (typeof field === 'function' ? field(r) : r[field]) === value);
      }
    });
    if (q) {
      out = out.filter((r) =>
        searchFields.some((f) => String((typeof f === 'function' ? f(r) : r[f]) ?? '').toLowerCase().includes(q)),
      );
    }
    if (sort?.field) {
      const get = sort.getValue || ((r) => r[sort.field]);
      out = [...out].sort((a, b) => {
        const va = get(a);
        const vb = get(b);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''));
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    }
    return out;
  })();

  const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
  const safePage = Math.min(page, maxPage);
  const pageRows = filtered.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  const toggleSort = (field, getValue) =>
    setSort((s) => ({ field, getValue, direction: s?.field === field && s.direction === 'asc' ? 'desc' : 'asc' }));

  return {
    search,
    setSearch: (v) => {
      setSearch(v);
      setPage(0);
    },
    sort,
    toggleSort,
    page: safePage,
    setPage,
    rowsPerPage,
    setRowsPerPage: (n) => {
      setRowsPerPage(n);
      setPage(0);
    },
    filtered,
    pageRows,
    total: filtered.length,
  };
}
