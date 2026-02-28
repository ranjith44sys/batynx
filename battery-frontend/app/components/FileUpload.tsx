"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Paperclip } from 'lucide-react';

interface FileUploadProps {
    onUploadSuccess: (attachment: { filename: string; originalName: string; hash: string; url: string }) => void;
    label?: string;
}

export default function FileUpload({ onUploadSuccess, label = "Attachment (PDF)" }: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError("Only PDF files are allowed.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("File size exceeds 10MB limit.");
            return;
        }

        setError(null);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:4000/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Upload failed");
            }

            const data = await response.json();
            setUploadedFile({
                name: file.name,
                size: (file.size / 1024 / 1024).toFixed(2) + " MB"
            });
            onUploadSuccess(data.file);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
            <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${isUploading ? "bg-gray-50 border-gray-200 cursor-wait" :
                        error ? "border-red-200 bg-red-50/30 hover:bg-red-50" :
                            uploadedFile ? "border-green-200 bg-green-50/30 hover:bg-green-50" :
                                "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-900 group"
                    }`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        <p className="text-sm font-bold text-gray-500">Uploading Document...</p>
                    </div>
                ) : uploadedFile ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="text-sm font-bold text-green-900">{uploadedFile.name}</p>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">{uploadedFile.size} • Verified</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <XCircle className="w-8 h-8 text-red-500" />
                        <div>
                            <p className="text-sm font-bold text-red-900">Upload Failed</p>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Paperclip className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">Click to attach PDF</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max 10MB • Spec sheets, Logs, etc.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
