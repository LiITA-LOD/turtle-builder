import { Box } from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import FileUpload, { type UploadedFile } from './FileUpload';
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

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

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
    try {
      // Format metadata as header
      const header = formatMetadataAsHeader(metadata);

      // Read all file contents
      const fileContents = await Promise.all(
        uploadedFiles.map(async (uploadedFile) => {
          const content = await readFileContent(uploadedFile.file);
          return content;
        })
      );

      // Concatenate header with all file contents
      const fullContent = [header, ...fileContents].join('\n');

      // Create and download the file
      downloadFile(fullContent, 'output.conllu');
    } catch (error) {
      console.error('Error processing files:', error);
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
