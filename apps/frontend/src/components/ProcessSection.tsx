import { Box, Button, Divider, Typography } from '@mui/material';
import type React from 'react';
import type { UploadedFile } from './FileUpload';
import type { Metadata } from './MetadataInput';

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
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
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
            Download CoNLL-U
          </Button>
          <Button
            variant="outlined"
            size="large"
            disabled
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
