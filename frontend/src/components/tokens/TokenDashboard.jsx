import { useState } from 'react';
import { Badge, Grid, Paper, Tab, Tabs } from '@mui/material';
import TokenCard from './TokenCard';
import { EmptyState } from '../common/States';
import { useT } from '../../hooks/usePreferences';

const ACTIVE = ['WAITING', 'IN_SERVICE', 'MISSED', 'CALLED', 'TRANSFERRED', 'CHECKED_IN'];

/**
 * Tabbed grid of token cards (Active / History).
 */
export default function TokenDashboard({ tokens, actions, pending, emptyAction }) {
  const t = useT();
  const [tabValue, setTabValue] = useState('ACTIVE');
  const active = tokens.filter((tok) => ACTIVE.includes(tok.status));
  const history = tokens.filter((tok) => !ACTIVE.includes(tok.status));
  const filteredTokens = tabValue === 'ACTIVE' ? active : history;

  return (
    <>
      <Paper sx={{ mb: 3 }} variant="outlined">
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab
            value="ACTIVE"
            label={
              <Badge badgeContent={active.length} color="primary" sx={{ '& .MuiBadge-badge': { right: -14 } }}>
                {t('myTokens.active')}
              </Badge>
            }
          />
          <Tab value="HISTORY" label={t('myTokens.history')} />
        </Tabs>
      </Paper>

      {filteredTokens.length === 0 ? (
        tabValue === 'ACTIVE' ? (
          <EmptyState title={t('myTokens.empty')} description={t('myTokens.emptyHint')} action={emptyAction} />
        ) : (
          <EmptyState title={t('myTokens.emptyHistory')} />
        )
      ) : (
        <Grid container spacing={3}>
          {filteredTokens.map((token) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={token._id}>
              <TokenCard token={token} actions={tabValue === 'ACTIVE' ? actions : {}} pending={pending} />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
