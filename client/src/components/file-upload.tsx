import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, File, FileText, Image, Video, Music, Archive } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  fileType: string;
  extension: string;
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  ticketNumber?: string;
  maxFiles?: number;
  disabled?: boolean;
}

export function FileUpload({ 
  onFilesChange, 
  ticketNumber, 
  maxFiles = 5, 
  disabled = false 
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'archive':
        return <Archive className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadUrl = ticketNumber 
        ? `/api/upload/${ticketNumber}` 
        : '/api/upload';

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [ticketNumber, toast]);

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    
    // Verificar limite de arquivos
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      toast({
        title: 'Limite excedido',
        description: `Máximo de ${maxFiles} arquivos permitidos`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    const uploadPromises = fileArray.map(uploadFile);
    const results = await Promise.all(uploadPromises);
    
    const successfulUploads = results.filter((result): result is UploadedFile => result !== null);
    
    if (successfulUploads.length > 0) {
      const newFiles = [...uploadedFiles, ...successfulUploads];
      setUploadedFiles(newFiles);
      onFilesChange(newFiles);
      
      toast({
        title: 'Upload concluído',
        description: `${successfulUploads.length} arquivo(s) enviado(s) com sucesso`,
      });
    }

    setIsUploading(false);
  }, [disabled, uploadedFiles, maxFiles, uploadFile, onFilesChange, toast]);

  const removeFile = useCallback((index: number) => {
    if (disabled) return;

    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  }, [disabled, uploadedFiles, onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileSelect = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow uploading the same file again
    e.target.value = '';
  }, [handleFiles]);

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <CardContent className="p-6 text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            {isUploading
              ? 'Enviando arquivos...'
              : 'Arraste arquivos aqui ou clique para selecionar'}
          </p>
          <p className="text-xs text-muted-foreground">
            Máximo {maxFiles} arquivos • Limite de 10MB por arquivo
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tipos suportados: PDF, DOC, XLS, PPT, imagens, vídeos, áudio, ZIP
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar,.7z,.xls,.xlsx,.ppt,.pptx,.csv,.mp4,.avi,.mov,.mp3,.wav,.bmp,.webp,.tiff"
        disabled={disabled}
      />

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Arquivos anexados:</p>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              data-testid={`uploaded-file-${index}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(file.fileType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="h-8 w-8 p-0"
                  data-testid={`button-remove-file-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}