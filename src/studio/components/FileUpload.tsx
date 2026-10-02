import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, File as FileIcon, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { assertImageUploadSize, assertVideoUploadSize } from '../lib/social/mediaUploadLimits';

export type FileUploadMeta = { originalFileName?: string };

interface FileUploadProps {
  value?: string;
  /** Second argument includes original filename when uploading from disk (for labels). */
  onChange: (url: string, meta?: FileUploadMeta) => void;
  bucket: string;
  /** Prefix inside the bucket (e.g. charter-petitions) — avoids cluttering bucket root */
  folder?: string;
  className?: string;
  label?: string;
  accept?: string;
  type?: 'image' | 'video' | 'document' | 'all';
  /** Smaller icon-first control for dense forms (e.g. Op-Ed submit). */
  variant?: 'default' | 'compact';
}

function storageErrMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  return '';
}

export default function FileUpload({ 
  value, 
  onChange, 
  bucket, 
  folder,
  className, 
  label, 
  accept = "*/*",
  type = 'all',
  variant = 'default',
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'video') assertVideoUploadSize(file);
      if (type === 'image') assertImageUploadSize(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'File too large.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const ownerFolder = folder ?? sessionData.session?.user.id ?? '';
      const prefix = ownerFolder ? `${ownerFolder.replace(/^\/+|\/+$/g, '')}/` : '';
      const filePath = `${prefix}${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl, { originalFileName: file.name });
    } catch (error) {
      console.error('Error uploading file:', error);
      const detail = storageErrMessage(error);
      alert(detail ? `Upload failed: ${detail}` : 'Upload failed. Check that you are signed in and Storage allows this bucket.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const iconClass =
    variant === 'compact'
      ? 'w-4 h-4 text-slate-500 group-hover:text-brand-blue transition-colors'
      : 'w-6 h-6 text-slate-400 group-hover:text-brand-blue transition-colors';

  const getIcon = () => {
    if (type === 'image') return <ImageIcon className={iconClass} />;
    if (type === 'video') return <VideoIcon className={iconClass} />;
    return <FileIcon className={iconClass} />;
  };

  const renderPreview = (compact: boolean) => {
    if (!value) return null;

    const isImage = value.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isVideo = value.match(/\.(mp4|webm|ogg)$/i);

    if (isImage) {
      return (
        <img 
          src={value} 
          alt="Preview" 
          className={compact ? 'h-11 w-11 rounded-lg object-cover shrink-0' : 'w-full h-full object-cover'}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (isVideo) {
      return (
        <video 
          src={value} 
          className={compact ? 'h-11 w-20 rounded-lg object-cover shrink-0' : 'w-full h-full object-cover'}
          controls={!compact}
          muted={compact}
          playsInline
        />
      );
    }

    return (
      <div
        className={
          compact
            ? 'h-11 w-11 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center shrink-0'
            : 'w-full h-full flex flex-col items-center justify-center bg-slate-100 gap-2'
        }
      >
        <FileIcon className={compact ? 'w-5 h-5 text-slate-400' : 'w-8 h-8 text-slate-400'} />
        {!compact ? (
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[80%]">
            {value.split('/').pop()}
          </p>
        ) : null}
      </div>
    );
  };

  if (variant === 'compact') {
    const addVerb = type === 'image' ? 'image' : type === 'video' ? 'video' : 'file';
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {label ? (
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
        ) : null}
        <div className="relative group flex items-center gap-1.5 min-h-[2.75rem]">
          {value ? (
            <>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 pl-1 pr-1 py-1">
                {renderPreview(true)}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-brand-blue transition-colors disabled:opacity-50"
                  title="Replace"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 text-brand-blue animate-spin" /> : <Upload className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onChange('', undefined)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-blue/40 hover:bg-brand-blue/[0.04] transition-all group disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 text-brand-blue animate-spin shrink-0" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 shrink-0 group-hover:border-brand-blue/20">
                  {getIcon()}
                </span>
              )}
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Add {addVerb}</span>
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept={accept}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
          {label}
        </label>
      )}
      
      <div className="relative group">
        {value ? (
          <div className="relative aspect-[21/9] rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
            {renderPreview(false)}
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 bg-white/80 backdrop-blur-md rounded-lg text-slate-600 hover:bg-white transition-all shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange('', undefined)}
                className="p-1.5 bg-white/80 backdrop-blur-md rounded-lg text-red-500 hover:bg-white transition-all shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full aspect-[21/9] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 hover:border-brand-blue hover:bg-brand-blue/5 transition-all group disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  {getIcon()}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Upload {type === 'all' ? 'File' : type}</p>
                  <p className="text-[9px] font-medium text-slate-400 mt-0.5">Max 50MB</p>
                </div>
              </>
            )}
          </button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept={accept}
          className="hidden"
        />
      </div>
    </div>
  );
}
