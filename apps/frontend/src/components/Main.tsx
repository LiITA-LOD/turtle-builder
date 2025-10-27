import { Box } from '@mui/material';
import React, { useState } from 'react';
import MetadataInput, { type Metadata } from './MetadataInput';
import FileUpload, { type UploadedFile } from './FileUpload';
import ProcessSection from './ProcessSection';

const Main: React.FC = () => {
  const [metadata, setMetadata] = useState<Metadata>({
    docId: '',
    docTitle: '',
    contributor: '',
    corpusRef: '',
    docAuthor: '',
    seeAlso: '',
    description: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleProcess = () => {
    console.log('Processing with metadata:', metadata);
    console.log('Processing with files:', uploadedFiles);
    // TODO: Implement actual processing logic
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <MetadataInput 
        metadata={metadata} 
        onMetadataChange={setMetadata} 
      />
      
      <FileUpload 
        uploadedFiles={uploadedFiles} 
        onFilesChange={setUploadedFiles} 
      />
      
      <ProcessSection 
        metadata={metadata}
        uploadedFiles={uploadedFiles}
        onProcess={handleProcess}
      />
    </Box>
  );
};

export default Main;
