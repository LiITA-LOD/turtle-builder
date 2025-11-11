import { Box, Button, Divider, Typography } from '@mui/material';
import type React from 'react';
import type { Metadata } from './MetadataInput';

interface ProcessSectionProps {
  metadata: Metadata;
  uploadedFile: File | null;
  onProcess: () => void;
  onDownloadTurtle: () => void;
}

const ProcessSection: React.FC<ProcessSectionProps> = ({
  metadata,
  uploadedFile,
  onProcess,
  onDownloadTurtle,
}) => {
  return (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom>
        3. Download output files
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={onProcess}
            disabled={!uploadedFile}
            sx={{
              px: 4,
              py: 2,
              fontSize: '1.2rem',
              minWidth: 200,
            }}
          >
            Download CoNLL-U
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={onDownloadTurtle}
            disabled={!uploadedFile}
            sx={{
              px: 4,
              py: 2,
              fontSize: '1.2rem',
              minWidth: 200,
            }}
          >
            Download Turtle
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProcessSection;
