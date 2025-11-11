import { Upload as UploadIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useState } from 'react';

export interface Metadata {
  docId: string;
  docTitle: string;
  contributor: string;
  corpusRef: string;
  docAuthor: string;
  seeAlso: string;
  description: string;
}

interface MetadataInputProps {
  metadata: Metadata;
  onMetadataChange: (metadata: Metadata) => void;
}

const MetadataInput: React.FC<MetadataInputProps> = ({
  metadata,
  onMetadataChange,
}) => {
  const [useRawInput, setUseRawInput] = useState(false);
  const [rawMetadata, setRawMetadata] = useState(`# docId=${metadata.docId}
# docTitle=${metadata.docTitle}
# contributor=${metadata.contributor}
# corpusRef=${metadata.corpusRef}
# docAuthor=${metadata.docAuthor}
# seeAlso=${metadata.seeAlso}
# description=${metadata.description}`);

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setRawMetadata(content);
        const parsedMetadata = parseRawMetadata(content);
        onMetadataChange(parsedMetadata);
      };
      reader.readAsText(file);
    }
  };

  const parseRawMetadata = (raw: string): Metadata => {
    const lines = raw.split('\n');
    const parsed: Partial<Metadata> = {};

    lines.forEach((line) => {
      if (line.startsWith('# ')) {
        const [key, ...valueParts] = line.substring(2).split('=');
        const value = valueParts.join('=');
        if (key && value !== undefined) {
          parsed[key as keyof Metadata] = value;
        }
      }
    });

    return {
      docId: parsed.docId || '',
      docTitle: parsed.docTitle || '',
      contributor: parsed.contributor || '',
      corpusRef: parsed.corpusRef || '',
      docAuthor: parsed.docAuthor || '',
      seeAlso: parsed.seeAlso || '',
      description: parsed.description || '',
    };
  };

  const formatMetadataAsRaw = (meta: Metadata): string => {
    return `# docId=${meta.docId}
# docTitle=${meta.docTitle}
# contributor=${meta.contributor}
# corpusRef=${meta.corpusRef}
# docAuthor=${meta.docAuthor}
# seeAlso=${meta.seeAlso}
# description=${meta.description}`;
  };

  const handleRawInputChange = (value: string) => {
    setRawMetadata(value);
    const parsedMetadata = parseRawMetadata(value);
    onMetadataChange(parsedMetadata);
  };

  const handleFormFieldChange = (field: keyof Metadata, value: string) => {
    const newMetadata = { ...metadata, [field]: value };
    onMetadataChange(newMetadata);
    setRawMetadata(formatMetadataAsRaw(newMetadata));
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        2. Revise linking metadata
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <input
          accept=".conllu"
          style={{ display: 'none' }}
          id="metadata-file-upload"
          type="file"
          onChange={handleFileLoad}
        />
        <label htmlFor="metadata-file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
            size="small"
          >
            Load from file
          </Button>
        </label>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1">Input Method:</Typography>
          <ToggleButtonGroup
            value={useRawInput ? 'raw' : 'form'}
            exclusive
            onChange={(_, value) => {
              if (value !== null) {
                setUseRawInput(value === 'raw');
              }
            }}
            size="small"
            sx={{
              height: '32px', // Match button height
              '& .MuiToggleButtonGroup-grouped': {
                padding: '6px 16px',
                border: '1px solid',
                borderColor: 'divider',
                '&:not(:first-of-type)': {
                  borderLeft: '1px solid',
                  borderLeftColor: 'divider',
                },
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            }}
          >
            <ToggleButton value="form">Friendly form</ToggleButton>
            <ToggleButton value="raw">Raw CoNLL-U header</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {useRawInput ? (
        <TextField
          fullWidth
          multiline
          rows={8}
          value={rawMetadata}
          onChange={(e) => handleRawInputChange(e.target.value)}
          placeholder="Enter metadata in raw format..."
          variant="outlined"
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="Document ID"
            value={metadata.docId}
            onChange={(e) => handleFormFieldChange('docId', e.target.value)}
            fullWidth
          />
          <TextField
            label="Document Title"
            value={metadata.docTitle}
            onChange={(e) => handleFormFieldChange('docTitle', e.target.value)}
            fullWidth
          />
          <TextField
            label="Contributor"
            value={metadata.contributor}
            onChange={(e) =>
              handleFormFieldChange('contributor', e.target.value)
            }
            fullWidth
          />
          <TextField
            label="Corpus Reference"
            value={metadata.corpusRef}
            onChange={(e) => handleFormFieldChange('corpusRef', e.target.value)}
            fullWidth
          />
          <TextField
            label="Document Author"
            value={metadata.docAuthor}
            onChange={(e) => handleFormFieldChange('docAuthor', e.target.value)}
            fullWidth
          />
          <TextField
            label="See Also"
            value={metadata.seeAlso}
            onChange={(e) => handleFormFieldChange('seeAlso', e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={metadata.description}
            onChange={(e) =>
              handleFormFieldChange('description', e.target.value)
            }
            fullWidth
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      )}
    </Box>
  );
};

export default MetadataInput;
