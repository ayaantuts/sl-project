import { TableCell, TableSortLabel } from '@mui/material';

/** Table header cell wired to useTableControls().toggleSort */
export default function SortableHeader({ field, label, controls, getValue, ...cellProps }) {
  const active = controls.sort?.field === field;
  return (
    <TableCell sortDirection={active ? controls.sort.direction : false} {...cellProps}>
      <TableSortLabel active={active} direction={active ? controls.sort.direction : 'asc'} onClick={() => controls.toggleSort(field, getValue)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );
}
