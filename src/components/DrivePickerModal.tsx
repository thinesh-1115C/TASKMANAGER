import React, { useState, useEffect } from 'react';
import { GoogleDriveFile, DriveAttachment } from '../types';
import { searchDriveFiles } from '../services/googleWorkspace';
import { Search, HardDrive, FileText, Check, X, Loader2, ExternalLink } from 'lucide-react';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSelectFiles: (files: DriveAttachment[]) => void;
  alreadySelected?: DriveAttachment[];
}

export default function DrivePickerModal({
  isOpen,
  onClose,
  token,
  onSelectFiles,
  alreadySelected = [],
}: DrivePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(alreadySelected.map((f) => f.id))
  );

  useEffect(() => {
    if (isOpen && token) {
      loadFiles('');
    }
  }, [isOpen, token]);

  const loadFiles = async (query: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchDriveFiles(token, query);
      setFiles(results);
    } catch (err: any) {
      setError(err.message || 'Failed to load Drive files');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles(searchQuery);
  };

  const toggleSelect = (file: GoogleDriveFile) => {
    const next = new Set(selectedIds);
    if (next.has(file.id)) {
      next.delete(file.id);
    } else {
      next.add(file.id);
    }
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const selectedFiles: DriveAttachment[] = files
      .filter((f) => selectedIds.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink: f.webViewLink,
        iconLink: f.iconLink,
      }));

    // Retain any already selected files that weren't in current search query results
    alreadySelected.forEach((f) => {
      if (selectedIds.has(f.id) && !selectedFiles.some((sf) => sf.id === f.id)) {
        selectedFiles.push(f);
      }
    });

    onSelectFiles(selectedFiles);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">Google Drive Files</h3>
              <p className="text-xs text-slate-500">Select files to attach to this task</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search files in Google Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm">Fetching files from your Google Drive...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-100">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
              <HardDrive className="w-8 h-8 stroke-1 text-slate-300" />
              <span className="text-sm">No files found matching your query</span>
            </div>
          ) : (
            files.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => toggleSelect(file)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400 truncate">{file.mimeType}</p>
                    </div>
                  </div>

                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
                    title="Preview in Drive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Attach Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
