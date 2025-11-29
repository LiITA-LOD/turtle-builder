import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import type React from 'react';

export interface CitationLayerLabels {
  documentLabel: string;
  paragraphLabel: string;
  sentenceLabel: string;
}

interface ProcessSectionProps {
  uploadedFile: File | null;
  onProcess: () => void;
  onDownloadTurtle: () => void;
  includeCitationLayer: boolean;
  includeMorphologicalLayer: boolean;
  citationLayerLabels: CitationLayerLabels;
  onCitationLayerChange: (value: boolean) => void;
  onMorphologicalLayerChange: (value: boolean) => void;
  onCitationLayerLabelsChange: (value: CitationLayerLabels) => void;
}

const ProcessSection: React.FC<ProcessSectionProps> = ({
  uploadedFile,
  onProcess,
  onDownloadTurtle,
  includeCitationLayer,
  includeMorphologicalLayer,
  citationLayerLabels,
  onCitationLayerChange,
  onMorphologicalLayerChange,
  onCitationLayerLabelsChange,
}) => {
  const handleLabelChange = (field: 'documentLabel' | 'paragraphLabel' | 'sentenceLabel', value: string) => {
    onCitationLayerLabelsChange({ ...citationLayerLabels, [field]: value });
  };
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
                checked={includeMorphologicalLayer}
                onChange={(e) => onMorphologicalLayerChange(e.target.checked)}
              />
            }
            label="Include morphological layer"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeCitationLayer}
                onChange={(e) => onCitationLayerChange(e.target.checked)}
              />
            }
            label="Include citation layer"
          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" component="h4" gutterBottom sx={{ mt: 3, mb: 2 }}>
            Citation layer labels
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr 1fr',
              },
              gap: 2,
            }}
          >
            <TextField
              label="Document layer label"
              value={citationLayerLabels.documentLabel}
              onChange={(e) =>
                handleLabelChange('documentLabel', e.target.value)
              }
              fullWidth
              placeholder="Document"
            />
            <TextField
              label="Paragraph layer label"
              value={citationLayerLabels.paragraphLabel}
              onChange={(e) =>
                handleLabelChange('paragraphLabel', e.target.value)
              }
              fullWidth
              placeholder="Paragraph"
            />
            <TextField
              label="Sentence layer label"
              value={citationLayerLabels.sentenceLabel}
              onChange={(e) =>
                handleLabelChange('sentenceLabel', e.target.value)
              }
              fullWidth
              placeholder="Sentence"
            />
          </Box>
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
