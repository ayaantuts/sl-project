import { useContext } from 'react';
import { PreferencesContext } from '../context/contexts';

export const usePreferences = () => useContext(PreferencesContext);
/** Translation helper: const t = useT(); t('nav.myTokens') */
export const useT = () => useContext(PreferencesContext).t;
