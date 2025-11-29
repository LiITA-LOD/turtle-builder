import { Box } from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import { parse } from 'liita-textlinker-frontend/conllu';
import FileUpload from './FileUpload';
import MetadataInput, { type Metadata } from './MetadataInput';
import ProcessSection, { type CitationLayerLabels } from './ProcessSection';
import { conlluToTurtle } from '../util/ttl';

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
  const [includeCitationLayer, setIncludeCitationLayer] = useState(true);
  const [includeMorphologicalLayer, setIncludeMorphologicalLayer] = useState(false);
  const [citationLayerLabels, setCitationLayerLabels] = useState<CitationLayerLabels>({
    documentLabel: 'Document',
    paragraphLabel: 'Paragraph',
    sentenceLabel: 'Sentence',
  });

  const extractMetadataFromContent = (content: string): Metadata => {
    const lines = content.split('\n');
    const parsed: Partial<Metadata> = {};

    lines.forEach((line) => {
      if (line.startsWith('# ')) {
        const [key, ...valueParts] = line.substring(2).split('=');
        const value = valueParts.join('=');
        if (key && value !== undefined) {
          const trimmedKey = key.trim();
          if (
            trimmedKey === 'docId' ||
            trimmedKey === 'docTitle' ||
            trimmedKey === 'contributor' ||
            trimmedKey === 'corpusRef' ||
            trimmedKey === 'docAuthor' ||
            trimmedKey === 'seeAlso' ||
            trimmedKey === 'description'
          ) {
            parsed[trimmedKey as keyof Metadata] = value;
          }
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

  const handleFileChange = async (file: File | null) => {
    setUploadedFile(file);

    if (file) {
      try {
        const content = await readFileContent(file);
        const extractedMetadata = extractMetadataFromContent(content);
        setMetadata(extractedMetadata);
      } catch (error) {
        console.error('Error reading file for metadata extraction:', error);
      }
    } else {
      // Reset metadata when file is removed
      setMetadata({
        docId: '',
        docTitle: '',
        contributor: '',
        corpusRef: '',
        docAuthor: '',
        seeAlso: '',
        description: '',
      });
    }
  };

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

  const stripMetadataFromContent = (content: string): string => {
    const lines = content.split('\n');
    const metadataKeys = [
      'docId',
      'docTitle',
      'contributor',
      'corpusRef',
      'docAuthor',
      'seeAlso',
      'description',
    ];

    // Filter out lines that are metadata comments
    const filteredLines = lines.filter((line) => {
      if (!line.startsWith('# ')) {
        return true; // Keep non-metadata lines
      }

      const [key] = line.substring(2).split('=');
      const trimmedKey = key?.trim();
      return !metadataKeys.includes(trimmedKey || '');
    });

    return filteredLines.join('\n');
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

      // Strip existing metadata from file content
      const contentWithoutMetadata = stripMetadataFromContent(fileContent);

      // Concatenate header with file content (without old metadata)
      const fullContent = [header, contentWithoutMetadata].join('\n');

      // Create and download the file
      downloadFile(fullContent, 'output.conllu');
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const handleDownloadTurtle = async () => {
    if (!uploadedFile) {
      console.error('No file uploaded');
      return;
    }

    try {
      // Read file content
      const fileContent = await readFileContent(uploadedFile);

      // Parse CONLL-U document
      const document = parse(fileContent);

      // Use metadata from state (user may have edited it)
      // Convert Metadata to DocumentMetadata format (they have the same structure)
      const documentMetadata = {
        docId: metadata.docId,
        docTitle: metadata.docTitle,
        contributor: metadata.contributor,
        corpusRef: metadata.corpusRef,
        docAuthor: metadata.docAuthor,
        seeAlso: metadata.seeAlso,
        description: metadata.description,
      };

      // Convert to Turtle format
      const turtleContent = conlluToTurtle(document, documentMetadata, {
        includeCitationLayer,
        includeMorphologicalLayer,
        citationLayerLabels,
      });

      // Determine filename based on docTitle or use default
      const filename = metadata.docTitle
        ? `${metadata.docTitle}.ttl`
        : 'output.ttl';

      // Download the file
      downloadFile(turtleContent, filename);
    } catch (error) {
      console.error('Error converting to Turtle:', error);
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
      <FileUpload file={uploadedFile} onFileChange={handleFileChange} />

      <MetadataInput metadata={metadata} onMetadataChange={setMetadata} />

      <ProcessSection
        uploadedFile={uploadedFile}
        onProcess={handleProcess}
        onDownloadTurtle={handleDownloadTurtle}
        includeCitationLayer={includeCitationLayer}
        includeMorphologicalLayer={includeMorphologicalLayer}
        citationLayerLabels={citationLayerLabels}
        onCitationLayerChange={setIncludeCitationLayer}
        onMorphologicalLayerChange={setIncludeMorphologicalLayer}
        onCitationLayerLabelsChange={setCitationLayerLabels}
      />
    </Box>
  );
};

export default Main;
