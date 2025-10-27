import {
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
}

const ItemType = {
  FILE: 'file',
};

interface DragItem {
  id: string;
  index: number;
  type: string;
}

interface FileItemProps {
  file: UploadedFile;
  index: number;
  moveFile: (dragIndex: number, hoverIndex: number) => void;
  removeFile: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  index,
  moveFile,
  removeFile,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType.FILE,
    item: { id: file.id, index, type: ItemType.FILE },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    options: {
      dropEffect: 'move',
    },
  });

  const [, drop] = useDrop({
    accept: ItemType.FILE,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset?.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveFile(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <ListItem
      ref={ref}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        bgcolor: isDragging ? 'primary.light' : 'background.paper',
        opacity: isDragging ? 0.3 : 1,
        transform: isDragging ? 'rotate(1deg) scale(1.02)' : 'none',
        transition: 'all 0.2s ease',
        boxShadow: isDragging ? 4 : 0,
        cursor: 'move',
        position: 'relative',
        zIndex: isDragging ? 1000 : 'auto',
      }}
    >
      <ListItemIcon>
        <DragIndicatorIcon
          color="action"
          sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        />
      </ListItemIcon>
      <ListItemText
        primary={file.name}
        secondary={`${(file.file.size / 1024).toFixed(1)} KB`}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton
          size="small"
          onClick={() => removeFile(file.id)}
          color="error"
          title="Remove file"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </ListItem>
  );
};

interface FileUploadProps {
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  uploadedFiles,
  onFilesChange,
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
      }));
      onFilesChange([...uploadedFiles, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(uploadedFiles.filter((file) => file.id !== id));
  };

  const moveFile = (dragIndex: number, hoverIndex: number) => {
    const items = [...uploadedFiles];
    const [draggedItem] = items.splice(dragIndex, 1);
    items.splice(hoverIndex, 0, draggedItem);
    onFilesChange(items);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        2. File Upload & Management
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 2 }}>
        <input
          accept="*/*"
          style={{ display: 'none' }}
          id="file-upload"
          multiple
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            sx={{ mr: 2 }}
          >
            Upload Files
          </Button>
        </label>
        <Typography variant="body2" color="text.secondary">
          Select multiple files to upload. You can drag and drop to reorder
          them.
        </Typography>
      </Box>

      {uploadedFiles.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Uploaded Files ({uploadedFiles.length})
          </Typography>

          <DndProvider backend={HTML5Backend}>
            <List>
              {uploadedFiles.map((file, index) => (
                <FileItem
                  key={file.id}
                  file={file}
                  index={index}
                  moveFile={moveFile}
                  removeFile={removeFile}
                />
              ))}
            </List>
          </DndProvider>
        </Paper>
      )}
    </Box>
  );
};

export default FileUpload;
