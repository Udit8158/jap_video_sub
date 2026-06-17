// File intake. Click opens the native chooser under Electron (real path) or a
// browser file input otherwise. Drag-and-drop resolves the real path via the
// preload bridge when available, falling back to the dropped file's name.

import { useRef, useState } from "react";
import { basename } from "../format";

interface Props {
  file: { path: string; name: string } | null;
  onPick: (path: string, name: string) => void;
}

export function DropZone({ file, onPick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = async () => {
    if (window.subly?.pickFile) {
      const p = await window.subly.pickFile();
      if (p) onPick(p, basename(p));
    } else {
      inputRef.current?.click();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const path = window.subly?.pathForFile?.(f) ?? f.name;
    onPick(path, f.name);
  };

  return (
    <button
      type="button"
      className={`dropzone${over ? " dropzone--over" : ""}${file ? " dropzone--loaded" : ""}`}
      data-testid="dropzone"
      onClick={pick}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(window.subly?.pathForFile?.(f) ?? f.name, f.name);
        }}
      />
      {file ? (
        <>
          <span className="dropzone__reel" aria-hidden />
          <span className="dropzone__name mono" data-testid="picked-name">
            {file.name}
          </span>
          <span className="dropzone__hint">click to choose a different file</span>
        </>
      ) : (
        <>
          <span className="dropzone__glyph" aria-hidden>
            ↓
          </span>
          <span className="dropzone__title">Drop a Japanese video here</span>
          <span className="dropzone__hint">or click to choose · video or audio</span>
        </>
      )}
    </button>
  );
}
