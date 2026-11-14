import { useContext } from 'react';
import { NotifyContext } from '../context/contexts';

/** notify(message, severity = 'success' | 'info' | 'warning' | 'error') */
export const useNotify = () => useContext(NotifyContext);
