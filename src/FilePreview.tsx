import { AlertCircle, FileText } from "lucide-react";
import { type FileItem, bytes, textExtensions } from "./model";
import { Modal, IconButton, FileIcon } from "./components";
import { X } from "lucide-react";
export default function FilePreview({
  detail,
  rootId,
  previewError,
  textPreview,
  onClose,
  onError,
}: {
  detail: FileItem;
  rootId: string;
  previewError: string;
  textPreview: string | null;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  return (
    <Modal label={`Preview ${detail.name}`} onClose={() => onClose()} wide>
      <div className="modal-header">
        <div>
          <h2>{detail.name}</h2>
          {detail.missing && (
            <p className="missing-label" role="status">
              File unavailable at its last known location. Its tags and notes
              are preserved.
            </p>
          )}
          <p>
            {bytes(detail.size)} · Read-only preview
            {textExtensions.includes(detail.ext) && " · First 64 KB"}
          </p>
        </div>
        <IconButton label="Close preview" onClick={() => onClose()}>
          <X size={19} />
        </IconButton>
      </div>
      <div className="preview-body">
        {previewError ? (
          <div className="empty-state">
            <AlertCircle size={26} />
            <h3>Preview unavailable</h3>
            <p>{previewError}</p>
          </div>
        ) : ["png", "jpg", "jpeg", "webp", "gif"].includes(detail.ext) ? (
          <img
            src={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
            alt={detail.name}
            onError={() =>
              onError(
                "This image could not be loaded. It may have moved or changed.",
              )
            }
          />
        ) : detail.ext === "pdf" ? (
          <div className="pdf-preview">
            <p className="pdf-help">
              If the PDF viewer is blank,{" "}
              <a
                href={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                open the PDF in a new tab
              </a>{" "}
              or{" "}
              <a
                href={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
                download={detail.name}
              >
                download a copy
              </a>
              .
            </p>
            {navigator.pdfViewerEnabled ? (
              <iframe
                title={detail.name}
                src={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
              />
            ) : (
              <div className="empty-state">
                <FileText size={28} />
                <h3>PDF viewer unavailable</h3>
                <p>
                  This browser does not support embedded PDF previews. Use the
                  links above to view a copy.
                </p>
              </div>
            )}
          </div>
        ) : ["mp3", "wav", "flac", "m4a", "ogg"].includes(detail.ext) ? (
          <audio
            controls
            src={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
            onError={() =>
              onError(
                "Your browser cannot play this audio format. Download a copy to open it locally.",
              )
            }
          />
        ) : ["mp4", "webm", "mov"].includes(detail.ext) ? (
          <video
            controls
            src={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
            onError={() =>
              onError(
                "Your browser cannot play this video format. Download a copy to open it locally.",
              )
            }
          />
        ) : textExtensions.includes(detail.ext) ? (
          <pre>
            {textPreview === null
              ? "Loading preview…"
              : textPreview || "This file is empty."}
          </pre>
        ) : (
          <div className="empty-state">
            <FileIcon file={detail} large />
            <h3>No preview for this format</h3>
            <p>
              The metadata panel has the file’s details.
              <br />
              Open the file in its native application to view its content.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
