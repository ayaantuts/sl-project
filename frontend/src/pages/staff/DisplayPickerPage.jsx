import { Link as RouterLink } from 'react-router-dom';
import { Button, Card, CardActions, CardContent, Grid, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TvIcon from '@mui/icons-material/Tv';
import PageHeader from '../../components/common/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States';
import { getDomains } from '../../services/api/domainService';
import { useApi } from '../../hooks/useApi';

export default function DisplayPickerPage() {
  const { data, loading, error, reload } = useApi(getDomains, []);
  return (
    <>
      <PageHeader
        title="Display Board"
        subtitle="Open a full-screen &quot;Now serving&quot; board for a waiting hall. It updates live and reads calls aloud."
      />
      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.domains.length === 0 && <EmptyState title="No domains available" />}
      <Grid container spacing={2}>
        {data?.domains.map((d) => (
          <Grid key={d._id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <TvIcon color="primary" />
                <Typography
                  sx={{
                    fontWeight: 600,
                    mt: 1
                  }}>
                  {d.name}
                </Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {d.type}
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to={`/display/${d._id}`} startIcon={<TvIcon />}>
                  Open here
                </Button>
                <Button href={`/display/${d._id}`} target="_blank" rel="noopener" startIcon={<OpenInNewIcon />}>
                  New window
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
