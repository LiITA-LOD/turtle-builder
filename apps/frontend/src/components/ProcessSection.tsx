import { Box, Button, Divider, Typography } from '@mui/material';
import type React from 'react';
import type { Metadata, UploadedFile } from './MetadataInput';

interface ProcessSectionProps {
  metadata: Metadata;
  uploadedFiles: UploadedFile[];
  onProcess: () => void;
}

const ProcessSection: React.FC<ProcessSectionProps> = ({
  metadata,
  uploadedFiles,
  onProcess,
}) => {
  return (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom>
        3. Process Data
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onProcess}
          disabled={uploadedFiles.length === 0}
          sx={{
            px: 4,
            py: 2,
            fontSize: '1.2rem',
            minWidth: 200,
          }}
        >
          Process Data
        </Button>
        {uploadedFiles.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Upload at least one file to enable processing
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ProcessSection;
