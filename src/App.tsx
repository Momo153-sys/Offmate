import AIChatPage from './pages/AIChatPage';
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  openDocument,
  downloadDocument,
} from './lib/document-viewer';
import {
  importDocument,
  retryDocumentExtraction,
} from './lib/document-import';
import {
  House,
  BookOpen,
  MapPin,
  Settings,
  WifiOff,
  Search,
  ArrowRight,
  FileText,
  Download,
  ShieldCheck,
  Menu,
  Plus,
Pencil,
Trash2,
Save,
  X,
  RefreshCw,
  Bot,
} from 'lucide-react';

import type { Resource } from './domain/resources';

import {
  createResource,
  editResource,
  listResources,
  removeResource,
  searchResources,
} from './services/resourceService';

import './App.css';

type Page = 'Home' | 'Knowledge' | 'AI Chat' | 'Explore' | 'Settings';

const navigation = [
  { name: 'Home' as Page, icon: House },
  { name: 'Knowledge' as Page, icon: BookOpen },
  { name: 'AI Chat' as Page, icon: Bot },
  { name: 'Explore' as Page, icon: MapPin },
  { name: 'Settings' as Page, icon: Settings },
];

function App() {
  const [page, setPage] = useState<Page>('Home');
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    setMenuOpen(false);
  };
  

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <WifiOff size={22} />
          </div>
          <span>offmate<span className="brand-dot">.</span></span>
          <button
            className="icon-button close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav className="navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? 'active' : ''}`}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {page === name && <span className="active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="offline-card">
            <div className="offline-card-icon">
              <ShieldCheck size={19} />
            </div>
            <strong>Your data stays yours.</strong>
            <p>Offmate is being built around local-first access.</p>
          </div>
          <p className="version-label">OFFMATE · EARLY ACCESS</p>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            <span>Offmate</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            Local-first mode
          </div>
        </header>

        <div className="page-content">
          {page === 'Home' && <HomePage onNavigate={navigate} />}
          {page === 'Knowledge' && <KnowledgePage />}
          {page === 'Explore' && <ExplorePage />}
          {page === 'Settings' && <SettingsPage />}
          {page === 'AI Chat' && <AIChatPage />}
        </div>
      </main>

      <nav className="mobile-bottom-nav">
        {navigation.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={`mobile-nav-item ${page === name ? 'active' : ''}`}
            onClick={() => navigate(name)}
          >
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}



function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <>
      <section className="welcome-section">
        <p className="eyebrow">YOUR PERSONAL OFFLINE SPACE</p>
        <h1>Ready when<br className="mobile-break" /> you need it.</h1>
        <p className="welcome-description">
          Your knowledge, essential resources, and tools — designed to stay
          accessible even when your connection doesn't.
        </p>
      </section>

      <section className="readiness-banner">
        <div className="readiness-icon">
          <WifiOff size={23} />
        </div>
        <div className="readiness-copy">
          <strong>Build your offline readiness</strong>
          <p>Prepare your resources before you lose your connection.</p>
        </div>
        <span className="readiness-tag">GET STARTED</span>
      </section>

      <div className="section-heading">
        <div>
          <h2>Your workspace</h2>
          <p>Choose where you want to begin.</p>
        </div>
      </div>

      <section className="workspace-grid">
        <WorkspaceCard
          icon={<BookOpen size={22} />}
          number="01"
          title="Knowledge"
          description="Keep your documents and study materials close, even offline."
          action="Open knowledge"
          onClick={() => onNavigate('Knowledge')}
        />
        <WorkspaceCard
          icon={<MapPin size={22} />}
          number="02"
          title="Explore"
          description="Prepare for offline maps, saved places, and route planning."
          action="Explore places"
          onClick={() => onNavigate('Explore')}
        />
      </section>

      <section className="section-heading recent-heading">
        <div>
          <h2>Quick access</h2>
          <p>Your workspace is ready for its first resources.</p>
        </div>
      </section>

      <button className="empty-resource" onClick={() => onNavigate('Knowledge')}>
        <div className="resource-icon">
          <FileText size={21} />
        </div>
        <div className="resource-copy">
          <strong>No saved resources yet</strong>
          <span>Add your first document to start building your offline library.</span>
        </div>
        <ArrowRight size={19} className="resource-arrow" />
      </button>

      <footer className="page-footer">
        <span>OFFMATE</span>
        <span>Less dependence. More freedom.</span>
      </footer>
    </>
  );
}

function WorkspaceCard({
  icon,
  number,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button className="workspace-card" onClick={onClick}>
      <div className="card-topline">
        <div className="workspace-icon">{icon}</div>
        <span className="card-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="card-action">
        {action} <ArrowRight size={16} />
      </span>
    </button>
  );
}


function KnowledgePage() {
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

 const refreshResources = useCallback(async (query: string) => {
  try {
    const results = query.trim()
      ? await searchResources(query)
      : await listResources();

    setResources(results);
    setError('');
  } catch {
    setError('Could not load your local resources. Please try again.');
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
  let cancelled = false;

  async function loadResources() {
    try {
      const results = search.trim()
        ? await searchResources(search)
        : await listResources();

      if (!cancelled) {
        setResources(results);
        setError('');
      }
    } catch {
      if (!cancelled) {
        setError('Could not load your local resources. Please try again.');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadResources();

  return () => {
    cancelled = true;
  };
}, [search]);

  function resetForm() {
    setTitle('');
    setContent('');
    setEditingId(null);
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (editingId) {
        await editResource(editingId, {
          title: title.trim(),
          content,
        });
        setNotice('Resource updated successfully.');
      } else {
        await createResource({
          title: title.trim(),
          kind: 'note',
          content,
        });
        setNotice('Note saved on this device.');
      }

      resetForm();
      await refreshResources(search);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(resource: Resource) {
    setEditingId(resource.id);
    setTitle(resource.title);
    setContent(resource.content ?? '');
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(resource: Resource) {
    const confirmed = window.confirm(
      `Delete "${resource.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      await removeResource(resource.id);

      if (editingId === resource.id) {
        resetForm();
      }

      setNotice('Resource deleted.');
      await refreshResources(search);
    } catch {
      setError('Could not delete this resource. Please try again.');
    }
  }


async function handleDocumentImport(
  event: ChangeEvent<HTMLInputElement>,
) {
  const file = event.target.files?.[0];

  if (!file) return;

  setImporting(true);
  setError('');
  setNotice('');

  try {
    await importDocument(file);

    setNotice(`"${file.name}" imported successfully.`);
    await refreshResources(search);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Could not import the document.',
    );
  } finally {
    setImporting(false);
    event.target.value = '';
  }
}


async function handleRetryExtraction(resource: Resource) {
  if (retryingId !== null) return;

  setRetryingId(resource.id);
  setError('');
  setNotice('');

  try {
    await retryDocumentExtraction(resource);

    setNotice(`Text extracted successfully from "${resource.title}".`);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Could not extract document text.',
    );
  } finally {
    setRetryingId(null);
    await refreshResources(search);
  }
}



  return (
    <section className="subpage">
      <p className="eyebrow">YOUR PERSONAL LIBRARY</p>
      <h1>Knowledge</h1>
      <p className="subpage-description">
        Keep your notes and important resources available on your device,
        even when you are offline.
      </p>

      <form className="resource-form" onSubmit={handleSubmit}>
        <div className="resource-form-heading">
          <div>
            <h2>{editingId ? 'Edit resource' : 'Create a note'}</h2>
            <p>
              {editingId
                ? 'Update your saved resource.'
                : 'Capture something important and keep it locally.'}
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>

        <label className="resource-label" htmlFor="resource-title">
          Title
        </label>
        <input
          id="resource-title"
          className="resource-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Give your note a title"
          maxLength={200}
          required
        />

        <label className="resource-label" htmlFor="resource-content">
          Content
        </label>
        <textarea
          id="resource-content"
          className="resource-textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write your thoughts here..."
          rows={5}
        />

        <div className="resource-form-footer">
          <span className="local-save-label">
            <ShieldCheck size={15} />
            Stored locally
          </span>

          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving ? (
              'Saving...'
            ) : editingId ? (
              <>
                <Save size={16} />
                Save changes
              </>
            ) : (
              <>
                <Plus size={17} />
                Create note
              </>
            )}
          </button>
        </div>
      </form>



<div className="document-import-section">
  <h2>Import a document</h2>
  <p>
    Import PDF, TXT, DOCX, JPG, or PNG files into your offline library. Maximum file size: 10 MB.
  </p>

  <label
    htmlFor="document-upload"
    className="secondary-button"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      cursor: importing ? 'wait' : 'pointer',
      marginTop: '12px',
    }}
  >
    <Download size={17} />
    {importing ? 'Importing...' : 'Import Document'}
  </label>

  <input
    id="document-upload"
    type="file"
    accept=".pdf,.txt,.docx,.jpg,.jpeg,.png"
    onChange={(event) => void handleDocumentImport(event)}
    disabled={importing}
    style={{ display: 'none' }}
  />
</div>


      {error && (
        <p className="library-message error-message" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="library-message success-message" role="status">
          {notice}
        </p>
      )}

      

      <div className="library-toolbar">
        <div>
          <h2>Your resources</h2>
          <p>
            {resources.length}{' '}
            {resources.length === 1 ? 'resource' : 'resources'} found
          </p>
        </div>

        <div className="search-field library-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles and content..."
            aria-label="Search your library"
          />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading your local resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <BookOpen size={27} />
          </div>
          <h3>
            {search.trim()
              ? 'No matching resources'
              : 'Your library starts here'}
          </h3>
          <p>
            {search.trim()
              ? 'Try another search term or check your spelling.'
              : 'Create your first note above. It will be saved on this device.'}
          </p>
        </div>
      ) : (
        <div className="resource-list">
          {resources.map((resource) => (
            <article className="resource-card" key={resource.id}>
              <div className="resource-card-main">
                <div className="resource-card-heading">
                  <div className="resource-card-icon">
                    <FileText size={19} />
                  </div>
                  <div className="resource-card-title">
                    <h3>{resource.title}</h3>
                    <span className="resource-type">
                      {resource.kind === 'note' ? 'NOTE' : 'DOCUMENT'}
                    </span>
                    {resource.kind === 'document' && resource.extractionStatus && (
  <span
    className={`extraction-status extraction-${resource.extractionStatus}`}
    title={`Text extraction: ${resource.extractionStatus}`}
  >
    {resource.extractionStatus === 'completed'
      ? 'Text searchable'
      : resource.extractionStatus === 'pending'
        ? 'Processing'
        : 'Extraction failed'}
  </span>
)}
                  </div>
                </div>

                {resource.content ? (
  <div className="resource-content-section">
    <p
      className={`resource-preview ${
        expandedResourceId === resource.id ? 'expanded' : ''
      }`}
    >
      {resource.content}
    </p>

    {resource.kind === 'document' && (
      <button
        type="button"
        className="preview-toggle"
        onClick={() =>
          setExpandedResourceId(
            expandedResourceId === resource.id ? null : resource.id
          )
        }
        aria-expanded={expandedResourceId === resource.id}
      >
        {expandedResourceId === resource.id
          ? 'Show less'
          : 'Read extracted text'}
      </button>
    )}
  </div>
) : resource.kind === 'document' && resource.file ? (
  <p className="resource-preview">
    File attached
    {resource.mimeType ? ` · ${resource.mimeType}` : ''}
  </p>
) : (
  <p className="resource-preview muted-preview">
    No text content
  </p>
)}

                <p className="resource-meta">
                  Updated {new Date(resource.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="resource-actions">


{resource.kind === 'document' &&
  resource.file &&
  resource.extractionStatus === 'failed' && (
    <button
      type="button"
      className="resource-action-button"
      onClick={() => void handleRetryExtraction(resource)}
      disabled={retryingId !== null}
      aria-label={`Retry extraction for ${resource.title}`}
      title="Retry text extraction"
    >
      <RefreshCw
        size={16}
        className={
          retryingId === resource.id ? 'retry-spinning' : ''
        }
      />
    </button>
  )}



{resource.kind === 'document' && resource.file && (
  <button
    type="button"
    className="resource-action-button"
    onClick={() => {
      try {
        openDocument(resource);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not open document.',
        );
      }
    }}
    aria-label={`Open ${resource.title}`}
    title="Open document"
  >
    <FileText size={16} />
  </button>
)}


{resource.kind === 'document' && resource.file && (
  <button
    type="button"
    className="resource-action-button"
    onClick={async () => {
  setError('');
  setNotice('');

  try {
    await downloadDocument(resource);
    setNotice(`"${resource.title}" is ready to save or share.`);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Could not download document.',
    );
  }
}}
    aria-label={`Download ${resource.title}`}
    title="Download document"
  >
    <Download size={16} />
  </button>
)}


                <button
                  type="button"
                  className="resource-action-button"
                  onClick={() => handleEdit(resource)}
                  aria-label={`Edit ${resource.title}`}
                  title="Edit resource"
                >
                  <Pencil size={16} />
                </button>

                <button
                  type="button"
                  className="resource-action-button delete-action"
                  onClick={() => void handleDelete(resource)}
                  aria-label={`Delete ${resource.title}`}
                  title="Delete resource"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  
}


function ExplorePage() {
  return (
    <section className="subpage">
      <p className="eyebrow">YOUR WORLD, AVAILABLE OFFLINE</p>
      <h1>Explore</h1>
      <p className="subpage-description">
        Prepare maps and useful local information before travelling or going offline.
      </p>
      <div className="feature-panel">
        <div className="feature-panel-icon"><MapPin size={24} /></div>
        <h3>Offline navigation</h3>
        <p>
          Our next steps will lay the groundwork for downloaded maps, saved
          places, and eventually offline route planning.
        </p>
        <div className="feature-detail">
          <Download size={17} />
          <span>Downloaded map data will be required for offline use.</span>
        </div>
        <span className="coming-soon-label">NAVIGATION · PLANNED</span>
      </div>
    </section>
  );
}

function SettingsPage() {
  const [localOnly, setLocalOnly] = useState(true);

  return (
    <section className="subpage">
      <p className="eyebrow">YOUR PREFERENCES</p>
      <h1>Settings</h1>
      <p className="subpage-description">
        Control how Offmate handles your device and data.
      </p>
      <div className="settings-panel">
        <div className="settings-row">
          <div className="settings-icon"><ShieldCheck size={21} /></div>
          <div className="settings-copy">
            <strong>Local-first preference</strong>
            <p>Prefer keeping your resources on this device.</p>
          </div>
          <button
            className={`toggle ${localOnly ? 'toggle-on' : ''}`}
            onClick={() => setLocalOnly((value) => !value)}
            role="switch"
            aria-checked={localOnly}
            aria-label="Toggle local-first preference"
          >
            <span />
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-icon"><Download size={21} /></div>
          <div className="settings-copy">
            <strong>Offline resources</strong>
            <p>Downloaded maps and document storage will appear here.</p>
          </div>
          <span className="settings-status">Not configured</span>
        </div>
      </div>
      <p className="settings-note">
        This preference is currently held in application state. Persistent
        settings storage is a feature we'll add next.
      </p>
    </section>
  );
}






export default App;
