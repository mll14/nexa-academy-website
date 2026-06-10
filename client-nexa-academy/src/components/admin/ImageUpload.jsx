import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import apiService from "@/services/apiService";

const MAX_SIZE_MB = 5;

/**
 * ImageUpload — Cloudinary-backed image picker for admin forms.
 *
 * Props:
 *   value      {string}   current URL (shown as preview)
 *   onChange   {fn}       called with the new Cloudinary URL after upload
 *   folder     {string}   Cloudinary folder, e.g. "nexa/programs" (default: "nexa")
 *   label      {string}   field label
 *   aspectHint {string}   optional hint text, e.g. "16:9 recommended"
 */
export default function ImageUpload({ value, onChange, folder = "nexa", label, aspectHint }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // 1. Get signed upload params from our backend
      const sigData = await apiService.post("/content/upload-signature/", { folder });

      // 2. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.api_key);
      formData.append("timestamp", sigData.timestamp);
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`,
        { method: "POST", body: formData },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Upload failed");
      }
      const data = await res.json();
      onChange(data.secure_url);
    } catch (e) {
      setError(e.message || "Upload failed. Check Cloudinary settings.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-muted-foreground block">
          {label}
          {aspectHint && <span className="ml-1 text-muted-foreground/50 font-normal">({aspectHint})</span>}
        </label>
      )}

      <div className="flex items-start gap-3">
        {/* Preview */}
        <div
          className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploading ? "Uploading…" : value ? "Replace" : "Upload image"}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
