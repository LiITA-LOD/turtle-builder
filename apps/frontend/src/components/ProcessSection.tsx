import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Typography,
} from '@mui/material';
import type React from 'react';
import type { Metadata } from './MetadataInput';

interface ProcessSectionProps {
  metadata: Metadata;
  uploadedFile: File | null;
  onProcess: () => void;
  onDownloadTurtle: () => void;
  includeCitationLayer: boolean;
  includeMorphologicalLayer: boolean;
  onCitationLayerChange: (value: boolean) => void;
  onMorphologicalLayerChange: (value: boolean) => void;
}

const ProcessSection: React.FC<ProcessSectionProps> = ({
  metadata,
  uploadedFile,
  onProcess,
  onDownloadTurtle,
  includeCitationLayer,
  includeMorphologicalLayer,
  onCitationLayerChange,
  onMorphologicalLayerChange,
}) => {
  return (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom>
        3. Download output files
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Turtle configuration
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeCitationLayer}
                onChange={(e) => onCitationLayerChange(e.target.checked)}
              />
            }
            label="Include citation layer"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeMorphologicalLayer}
                onChange={(e) => onMorphologicalLayerChange(e.target.checked)}
              />
            }
            label="Include morphological layer"
          />
        </Box>
      </Box>

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
