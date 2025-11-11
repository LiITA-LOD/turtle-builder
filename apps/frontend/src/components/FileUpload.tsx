import {
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
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

      {file && (
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">{file.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              ({(file.size / 1024).toFixed(1)} KB)
            </Typography>
          </Box>
          <IconButton onClick={removeFile} color="error" title="Remove file">
            <DeleteIcon />
          </IconButton>
        </Paper>
      )}

      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">
          {file ? 'File Uploaded' : 'No file uploaded'}
        </Typography>
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
            {file ? 'Replace File' : 'Upload File'}
          </Button>
        </label>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a CoNLL-U file to upload.
      </Typography>
    </Box>
  );
};

export default FileUpload;
