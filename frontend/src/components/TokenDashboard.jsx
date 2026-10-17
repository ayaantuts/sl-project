import React, { useState } from 'react';
import { Container, Grid, Typography, Box, Tabs, Tab, Paper } from '@mui/material';
import TokenCard from './TokenCard';

// Placeholder Mock Data (To be replaced by Socket.io + REST API state)
const MOCK_TOKENS = [
  {
    id: '1',
    ticketNumber: 'DOC-042',
    serviceName: 'Document Verification',
    status: 'IN_SERVICE',
    position: 1,
    priorityTier: 0,
    groupSize: 1,
    shiftReason: null
  },
  {
    id: '2',
    ticketNumber: 'EMG-003',
    serviceName: 'Triage Desk',
    status: 'WAITING',
    position: 2,
    priorityTier: 3,
    groupSize: 1,
    shiftReason: 'Emergency priority bump applied'
  },
  {
    id: '3',
    ticketNumber: 'DOC-043',
    serviceName: 'Document Verification',
    status: 'WAITING',
    position: 3,
    priorityTier: 2,
    groupSize: 3,
    shiftReason: '+1 position shift due to emergency token EMG-003 call'
  }
];

export default function TokenDashboard() {
  const [tabValue, setTabValue] = useState('ALL');

  const filteredTokens = MOCK_TOKENS.filter((t) => {
    if (tabValue === 'ALL') return true;
    return t.status === tabValue;
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Live Operational Queue
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time updates on active tokens across physical desks.
        </Typography>
      </Box>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, val) => setTabValue(val)} 
          indicatorColor="primary" 
          textColor="primary"
        >
          <Tab label="All Tokens" value="ALL" />
          <Tab label="Waiting" value="WAITING" />
          <Tab label="In Service" value="IN_SERVICE" />
        </Tabs>
      </Paper>

      {/* Token Cards Grid */}
      <Grid container spacing={3}>
        {filteredTokens.map((token) => (
          <Grid item xs={12} sm={6} md={4} key={token.id}>
            <TokenCard token={token} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}