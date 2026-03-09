import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../app/AuthContext";
import "./documents.css";

const CATEGORY_COLORS = [
  "#5b7cf0",
  "#7b5cff",
  "#45b26b",
  "#ff8d47",
  "#ef5da8",
  "#00a9ff",
  "#8c9eff",
  "#22c55e",
];

const DEFAULT_CATEGORY_ID = "uncategorized";
const DEFAULT_CATEGORY = {
  id: DEFAULT_CATEGORY_ID,
  name: "uncategorized",
  color: "#7b5cff",
  system: true,
};
const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB visual meter
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.rtf,.csv,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif";

function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function formatBytes(bytes = 0) {
  const num = Number(bytes || 0);
  if (num <= 0) return "0.0 MB";
  const mb = num / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getExtension(name = "") {
  const part = String(name).split(".").pop();
  if (!part || part === name) return "FILE";
  return part.toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function includesQuery(documentItem, query) {
  const q = normalizeText(query);
  if (!q) return true;
  return [
    documentItem.name,
    documentItem.categoryName,
    documentItem.typeLabel,
    documentItem.extension,
  ].some((item) => normalizeText(item).includes(q));
}

function getFileTypeLabel(file) {
  const mime = String(file?.type || "");
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Document";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "Spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "Presentation";
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("text/")) return "Text";
  return getExtension(file?.name);
}

function getPreviewKind(documentItem) {
  const mime = String(documentItem?.mimeType || "");
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf")) return "pdf";
  if (mime.startsWith("text/")) return "text";
  return "file";
}

function getHealthLabel(usedBytes) {
  const pct = usedBytes / MAX_STORAGE_BYTES;
  if (pct < 0.35) return "Excellent";
  if (pct < 0.7) return "Good";
  if (pct < 0.9) return "Warning";
  return "Critical";
}

function metaStorageKey(userKey) {
  return `taskflow_documents_meta_${userKey}_v1`;
}

function dbNameForUser(userKey) {
  return `taskflow_documents_blob_${userKey}_v1`;
}

function openDb(userKey) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(dbNameForUser(userKey), 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });
}

async function putBlob(userKey, id, file) {
  const db = await openDb(userKey);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put({ id, blob: file });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Failed to store file."));
    };
  });
}

async function getBlob(userKey, id) {
  const db = await openDb(userKey);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const req = tx.objectStore("files").get(id);
    req.onsuccess = () => {
      db.close();
      resolve(req.result?.blob || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error || new Error("Failed to read file."));
    };
  });
}

async function deleteBlob(userKey, id) {
  const db = await openDb(userKey);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Failed to delete file."));
    };
  });
}

function readDocumentsMeta(userKey) {
  const raw = localStorage.getItem(metaStorageKey(userKey));
  const parsed = safeParse(raw, {});
  const categories = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const documents = Array.isArray(parsed?.documents) ? parsed.documents : [];

  const safeCategories = [
    DEFAULT_CATEGORY,
    ...categories
      .filter((item) => item && item.id !== DEFAULT_CATEGORY_ID)
      .map((item) => ({
        id: item.id,
        name: String(item.name || "Untitled").trim() || "Untitled",
        color: item.color || CATEGORY_COLORS[0],
      })),
  ];

  const safeDocuments = documents.map((item) => ({
    id: item.id,
    name: String(item.name || "Untitled").trim() || "Untitled",
    size: Number(item.size || 0),
    mimeType: String(item.mimeType || ""),
    extension: item.extension || getExtension(item.name),
    typeLabel: item.typeLabel || getExtension(item.name),
    categoryId: item.categoryId || DEFAULT_CATEGORY_ID,
    categoryName: item.categoryName || DEFAULT_CATEGORY.name,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  }));

  return {
    categories: safeCategories,
    documents: safeDocuments,
  };
}

function saveDocumentsMeta(userKey, value) {
  localStorage.setItem(metaStorageKey(userKey), JSON.stringify(value));
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7.5a2.5 2.5 0 0 1 2.5-2.5h4l2 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m7 9 5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 7h11M8 12h11M8 17h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="4" cy="7" r="1.25" fill="currentColor" />
      <circle cx="4" cy="12" r="1.25" fill="currentColor" />
      <circle cx="4" cy="17" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconNewFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7.5a2.5 2.5 0 0 1 2.5-2.5h4l2 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10v5M9.5 12.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CategorySelect({ categories, value, onSelect, onCreateRequest, open, setOpen, align = "left" }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [setOpen]);

  const selected = categories.find((item) => item.id === value) || DEFAULT_CATEGORY;

  return (
    <div className="docs-select" ref={wrapRef}>
      <button type="button" className="docs-select-trigger" onClick={() => setOpen((prev) => !prev)}>
        <span className="docs-select-icon"><IconFolder /></span>
        <span>{selected.name}</span>
        <span className="docs-select-arrow">⌄</span>
      </button>

      {open && (
        <div className={`docs-select-menu ${align === "right" ? "right" : ""}`}>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`docs-select-option ${category.id === value ? "active" : ""}`}
              onClick={() => {
                onSelect(category.id);
                setOpen(false);
              }}
            >
              <span className="docs-select-swatch" style={{ background: category.color }} />
              <span>{category.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="docs-select-create"
            onClick={() => {
              setOpen(false);
              onCreateRequest();
            }}
          >
            <span className="docs-select-create-icon"><IconNewFolder /></span>
            <span>Create New Category</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewModal({ item, objectUrl, textPreview, loading, onClose, onDownload }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const previewKind = getPreviewKind(item);

  return (
    <div className="docs-modal-backdrop" onClick={onClose}>
      <div className="docs-modal" onClick={(event) => event.stopPropagation()}>
        <div className="docs-modal-head">
          <div>
            <div className="docs-modal-title">{item.name}</div>
            <div className="docs-modal-sub">{item.categoryName} · {formatBytes(item.size)} · {item.typeLabel}</div>
          </div>
          <div className="docs-modal-actions">
            <button type="button" className="docs-btn docs-btn-ghost" onClick={() => onDownload(item)}>
              <span className="docs-btn-icon"><IconDownload /></span>
              Download
            </button>
            <button type="button" className="docs-btn docs-btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="docs-modal-body">
          {loading && <div className="docs-preview-empty">Loading preview...</div>}

          {!loading && previewKind === "image" && objectUrl && (
            <img src={objectUrl} alt={item.name} className="docs-preview-image" />
          )}

          {!loading && previewKind === "pdf" && objectUrl && (
            <iframe title={item.name} src={objectUrl} className="docs-preview-frame" />
          )}

          {!loading && previewKind === "text" && (
            <pre className="docs-preview-text">{textPreview || "No text preview available."}</pre>
          )}

          {!loading && previewKind === "file" && (
            <div className="docs-preview-empty">
              This file type does not support inline preview here. Use download to open it in the right app.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const userKey = user?.id || user?.username || "guest";

  const [store, setStore] = useState(() => readDocumentsMeta(userKey));
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadCategory, setUploadCategory] = useState(DEFAULT_CATEGORY_ID);
  const [selectOpen, setSelectOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setStore(readDocumentsMeta(userKey));
  }, [userKey]);

  useEffect(() => {
    saveDocumentsMeta(userKey, store);
  }, [store, userKey]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const categoryMap = useMemo(() => {
    const map = new Map();
    store.categories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [store.categories]);

  const documents = useMemo(() => {
    return [...store.documents]
      .map((item) => ({
        ...item,
        categoryName: categoryMap.get(item.categoryId)?.name || item.categoryName || DEFAULT_CATEGORY.name,
        categoryColor: categoryMap.get(item.categoryId)?.color || DEFAULT_CATEGORY.color,
      }))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [store.documents, categoryMap]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((item) => {
      const categoryMatches = activeCategory === "all" ? true : item.categoryId === activeCategory;
      return categoryMatches && includesQuery(item, query);
    });
  }, [documents, activeCategory, query]);

  const usedBytes = useMemo(
    () => documents.reduce((sum, item) => sum + Number(item.size || 0), 0),
    [documents]
  );

  const storagePercent = Math.min((usedBytes / MAX_STORAGE_BYTES) * 100, 100);
  const healthLabel = getHealthLabel(usedBytes);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    documents.forEach((item) => {
      counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1);
    });
    return counts;
  }, [documents]);

  function createCategory() {
    const name = String(newCategoryName || "").trim();
    if (!name) {
      setMessage("Enter a category name first.");
      return;
    }

    const exists = store.categories.some((item) => normalizeText(item.name) === normalizeText(name));
    if (exists) {
      setMessage("That category already exists.");
      return;
    }

    const nextCategory = {
      id: uid("cat"),
      name,
      color: newCategoryColor,
    };

    setStore((prev) => ({
      ...prev,
      categories: [...prev.categories, nextCategory],
    }));
    setActiveCategory(nextCategory.id);
    setUploadCategory(nextCategory.id);
    setShowCategoryForm(false);
    setNewCategoryName("");
    setNewCategoryColor(CATEGORY_COLORS[0]);
    setMessage("Category created.");
  }

  async function handleFiles(selectedFiles) {
    const files = Array.from(selectedFiles || []);
    if (!files.length) return;

    setUploading(true);

    try {
      const selectedCategory = categoryMap.get(uploadCategory) || DEFAULT_CATEGORY;
      const createdAt = new Date().toISOString();
      const metaItems = [];

      for (const file of files) {
        const id = uid("doc");
        await putBlob(userKey, id, file);
        metaItems.push({
          id,
          name: file.name,
          size: Number(file.size || 0),
          mimeType: file.type || "application/octet-stream",
          extension: getExtension(file.name),
          typeLabel: getFileTypeLabel(file),
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          createdAt,
          updatedAt: createdAt,
        });
      }

      setStore((prev) => ({
        ...prev,
        documents: [...metaItems, ...prev.documents],
      }));
      setMessage(`${metaItems.length} file${metaItems.length > 1 ? "s" : ""} uploaded.`);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function openPreview(item) {
    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewText("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    try {
      const blob = await getBlob(userKey, item.id);
      if (!blob) {
        setPreviewLoading(false);
        setMessage("File data not found.");
        return;
      }

      const kind = getPreviewKind(item);
      if (kind === "text") {
        const text = await blob.text();
        setPreviewText(text.slice(0, 8000));
      } else {
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not open preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function downloadDocument(item) {
    try {
      const blob = await getBlob(userKey, item.id);
      if (!blob) {
        setMessage("File data not found.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (error) {
      console.error(error);
      setMessage("Could not download file.");
    }
  }

  async function deleteDocument(item) {
    const ok = window.confirm(`Delete ${item.name}?`);
    if (!ok) return;

    try {
      await deleteBlob(userKey, item.id);
      setStore((prev) => ({
        ...prev,
        documents: prev.documents.filter((doc) => doc.id !== item.id),
      }));
      if (previewItem?.id === item.id) {
        setPreviewItem(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl("");
        }
      }
      setMessage("Document deleted.");
    } catch (error) {
      console.error(error);
      setMessage("Delete failed.");
    }
  }

  function closePreview() {
    setPreviewItem(null);
    setPreviewText("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="docs-page-bleed">
      <div className="docs-page">
        <section className="docs-hero">
          <h1>Documents</h1>
          <p>Upload, manage, organize, and preview your documents</p>
        </section>

        <section
          className={`docs-card docs-upload-card ${dragActive ? "drag-active" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={onDrop}
        >
          <div className="docs-dropzone">
            <div className="docs-upload-icon"><IconUpload /></div>
            <h2>Drag and drop files here</h2>
            <p>or click below to select files</p>

            <div className="docs-upload-actions">
              <button
                type="button"
                className="docs-btn docs-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Select Files
              </button>

              <CategorySelect
                categories={store.categories}
                value={uploadCategory}
                onSelect={setUploadCategory}
                onCreateRequest={() => setShowCategoryForm(true)}
                open={selectOpen}
                setOpen={setSelectOpen}
              />
            </div>

            <div className="docs-upload-limit">Max 52 MB</div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              multiple
              hidden
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        </section>

        <section className="docs-card docs-category-card">
          <div className="docs-card-head docs-category-head">
            <div className="docs-category-title-wrap">
              <div className="docs-category-icon"><IconFolder /></div>
              <h2>Categories</h2>
              <div className="docs-storage-pill">
                <span className="docs-storage-icon"><IconFolder /></span>
                <span>{formatBytes(usedBytes)} / 1 GB</span>
                <span className="docs-storage-bar"><span style={{ width: `${storagePercent}%` }} /></span>
                <strong>{healthLabel}</strong>
              </div>
            </div>

            <button type="button" className="docs-link-btn" onClick={() => setShowCategoryForm(true)}>
              <span className="docs-link-btn-icon"><IconNewFolder /></span>
              New Category
            </button>
          </div>

          {showCategoryForm && (
            <div className="docs-category-form">
              <label className="docs-field">
                <span>Category Name</span>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g., Work, Personal, Finance"
                  className="docs-input docs-input-dark"
                />
              </label>

              <div className="docs-color-row">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`docs-color-swatch ${newCategoryColor === color ? "active" : ""}`}
                    style={{ background: color }}
                    onClick={() => setNewCategoryColor(color)}
                    aria-label={`Choose color ${color}`}
                  />
                ))}
              </div>

              <div className="docs-form-actions">
                <button type="button" className="docs-btn docs-btn-primary" onClick={createCategory}>
                  Create
                </button>
                <button
                  type="button"
                  className="docs-btn docs-btn-ghost"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setNewCategoryName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="docs-category-chip-row">
            <button
              type="button"
              className={`docs-chip ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              All ({documents.length})
            </button>
            {store.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`docs-chip ${activeCategory === category.id ? "active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="docs-chip-dot" style={{ background: category.color }} />
                {category.name} ({categoryCounts.get(category.id) || 0})
              </button>
            ))}
          </div>
        </section>

        <section className="docs-toolbar-row">
          <div className="docs-search-wrap">
            <span className="docs-search-icon"><IconSearch /></span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents..."
              className="docs-search-input"
            />
          </div>

          <div className="docs-view-toggle">
            <button
              type="button"
              className={`docs-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <IconList />
            </button>
            <button
              type="button"
              className={`docs-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <IconGrid />
            </button>
          </div>
        </section>

        {message && <div className="docs-message">{message}</div>}

        {filteredDocuments.length === 0 ? (
          <section className="docs-card docs-empty-state">
            <div className="docs-empty-icon"><IconDocument /></div>
            <h3>No documents yet</h3>
            <p>Upload your first document to get started</p>
            <button type="button" className="docs-btn docs-btn-primary" onClick={() => fileInputRef.current?.click()}>
              Upload Document
            </button>
          </section>
        ) : (
          <section className={`docs-results ${viewMode}`}>
            {filteredDocuments.map((item) => (
              <article
                key={item.id}
                className={`docs-card docs-document-card ${viewMode === "list" ? "list" : "grid"}`}
                onDoubleClick={() => openPreview(item)}
              >
                <div className="docs-document-main">
                  <div className="docs-file-badge">{item.extension}</div>
                  <div className="docs-document-copy">
                    <div className="docs-document-name">{item.name}</div>
                    <div className="docs-document-meta">
                      <span>{item.typeLabel}</span>
                      <span>•</span>
                      <span>{formatBytes(item.size)}</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="docs-document-side">
                  <span className="docs-category-tag" style={{ borderColor: item.categoryColor, color: item.categoryColor }}>
                    {item.categoryName}
                  </span>
                  <div className="docs-document-actions">
                    <button type="button" className="docs-icon-btn" onClick={() => openPreview(item)} title="Preview">
                      <IconDocument />
                    </button>
                    <button type="button" className="docs-icon-btn" onClick={() => downloadDocument(item)} title="Download">
                      <IconDownload />
                    </button>
                    <button type="button" className="docs-icon-btn danger" onClick={() => deleteDocument(item)} title="Delete">
                      <IconTrash />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {previewItem && (
        <PreviewModal
          item={previewItem}
          objectUrl={previewUrl}
          textPreview={previewText}
          loading={previewLoading}
          onClose={closePreview}
          onDownload={downloadDocument}
        />
      )}
    </div>
  );
}
