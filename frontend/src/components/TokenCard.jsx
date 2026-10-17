import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Divider } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const statusColors = {
  WAITING: 'warning',
  IN_SERVICE: 'primary',
  COMPLETED: 'success',
  TRANSFERRED: 'info',
  MISSED: 'error'
};

export default function TokenCard({ token }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <CardContent>
        {/* Header: Ticket Number & Status */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            {token.ticketNumber}
          </Typography>
          <Chip 
            label={token.status} 
            color={statusColors[token.status] || 'default'} 
            size="small" 
            sx={{ fontWeight: 'bold' }} 
          />
        </Box>

        {/* Service & Priority Meta */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Service: <strong>{token.serviceName}</strong>
        </Typography>
        
        <Box display="flex" gap={1} my={1}>
          {token.priorityTier > 0 && (
            <Chip 
              label={token.priorityTier === 3 ? 'Emergency' : token.priorityTier === 2 ? 'Vulnerable' : 'Scheduled'} 
              color={token.priorityTier === 3 ? 'error' : 'secondary'} 
              size="small" 
              variant="filled" 
            />
          )}
          {token.groupSize > 1 && (
            <Chip label={`Group of ${token.groupSize}`} size="small" variant="outlined" />
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Dynamic Position & Reason Banner */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <AccessTimeIcon fontSize="small" color="action" />
          <Typography variant="body2">
            Position in Queue: <strong>#{token.position}</strong>
          </Typography>
        </Box>

        {token.shiftReason && (
          <Box 
            bgcolor="action.hover" 
            p={1} 
            borderRadius={1} 
            display="flex" 
            alignItems="flex-start" 
            gap={0.8}
            mt={1}
          >
            <InfoOutlinedIcon fontSize="small" color="info" sx={{ mt: 0.2 }} />
            <Typography variant="caption" color="text.secondary">
              {token.shiftReason}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}