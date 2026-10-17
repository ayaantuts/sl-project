import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

export default function Navbar() {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <ConfirmationNumberIcon color="primary" sx={{ mr: 1.5 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          WaitLess
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label="Live Feed" color="success" size="small" variant="outlined" />
        </Box>
      </Toolbar>
    </AppBar>
  );
}