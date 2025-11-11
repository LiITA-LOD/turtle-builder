import {
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import type React from 'react';

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ file, onFileChange }) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    onFileChange(files[0]);
  };

  const removeFile = () => {
    onFileChange(null);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        1. Upload linked CoNLL-U
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {file ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" noWrap>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(file.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
          <IconButton
            onClick={removeFile}
            color="error"
            title="Remove file"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <input
            accept=".conllu"
            style={{ display: 'none' }}
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadIcon />}
            >
              Upload file
            </Button>
          </label>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;
