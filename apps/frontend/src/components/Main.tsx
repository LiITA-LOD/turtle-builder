import { Box } from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import FileUpload from './FileUpload';
import MetadataInput, { type Metadata } from './MetadataInput';
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

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const formatMetadataAsHeader = (meta: Metadata): string => {
    return `# docId=${meta.docId}
# docTitle=${meta.docTitle}
# contributor=${meta.contributor}
# corpusRef=${meta.corpusRef}
# docAuthor=${meta.docAuthor}
# seeAlso=${meta.seeAlso}
# description=${meta.description}
`;
  };

  const handleProcess = async () => {
    if (!uploadedFile) {
      console.error('No file uploaded');
      return;
    }

    try {
      // Format metadata as header
      const header = formatMetadataAsHeader(metadata);

      // Read file content
      const fileContent = await readFileContent(uploadedFile);

      // Concatenate header with file content
      const fullContent = [header, fileContent].join('\n');

      // Create and download the file
      downloadFile(fullContent, 'output.conllu');
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => {
        reject(e);
      };
      reader.readAsText(file);
    });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <MetadataInput metadata={metadata} onMetadataChange={setMetadata} />

      <FileUpload
        file={uploadedFile}
        onFileChange={setUploadedFile}
      />

      <ProcessSection
        metadata={metadata}
        uploadedFile={uploadedFile}
        onProcess={handleProcess}
      />
    </Box>
  );
};

export default Main;
