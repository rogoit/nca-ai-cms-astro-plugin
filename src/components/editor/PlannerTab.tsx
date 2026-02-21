import { useState, useEffect, useCallback } from 'react';
import type { ScheduledPostData } from './types';
import { styles } from './styles';

function getStatusColor(status: string): string {
  switch (status) {
    case 'published':
      return 'var(--color-success, #4ade80)';
    case 'generated':
      return 'var(--color-primary, #e63946)';
    case 'failed':
      return 'var(--color-error, #f87171)';
    default:
      return 'var(--color-text-muted, #b8b5b0)';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Veröffentlicht';
    case 'generated':
      return 'Generiert';
    case 'scheduled':
      return 'Geplant';
    case 'failed':
      return 'Fehlgeschlagen';
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function PlannerTab() {
  const [posts, setPosts] = useState<ScheduledPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newInput, setNewInput] = useState('');
  const [newInputType] = useState('keyword');
  const [newDate, setNewDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scheduler');
      if (!res.ok) throw new Error('Fehler beim Laden der geplanten Beiträge');
      const data = (await res.json()) as ScheduledPostData[];
      setPosts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const autoPublishDue = useCallback(async () => {
    try {
      await fetch('/api/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-publish' }),
      });
      await loadPosts();
    } catch {
      // silent fail for auto-publish
    }
  }, [loadPosts]);

  useEffect(() => {
    loadPosts().then(() => autoPublishDue());
  }, [loadPosts, autoPublishDue]);

  const handleAdd = async () => {
    if (!newInput.trim() || !newDate) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: newInput,
          inputType: newInputType,
          scheduledDate: newDate,
        }),
      });
      if (!res.ok) throw new Error('Fehler beim Hinzufügen');
      setNewInput('');
      setNewDate('');
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Hinzufügen',
      );
    } finally {
      setAdding(false);
    }
  };

  const handleGenerate = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch('/api/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', id }),
      });
      if (!res.ok) throw new Error('Fehler beim Generieren');
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Generieren',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch('/api/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', id }),
      });
      if (!res.ok) throw new Error('Fehler beim Veröffentlichen');
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler beim Veröffentlichen',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch('/api/scheduler', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Löschen',
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={styles.plannerContent}>
      <div style={styles.plannerForm}>
        <h3 style={{ ...styles.heading, fontSize: '1rem' }}>
          Neuen Beitrag planen
        </h3>
        <div style={styles.plannerFormRow}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="planner-input">
              Thema / Keyword
            </label>
            <input
              id="planner-input"
              type="text"
              style={styles.input}
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="z.B. Next.js App Router..."
              disabled={adding}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="planner-date">
              Veröffentlichungsdatum
            </label>
            <input
              id="planner-date"
              type="datetime-local"
              style={styles.input}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={adding}
            />
          </div>
          <button
            type="button"
            style={{
              ...styles.generateButton,
              width: 'auto',
              whiteSpace: 'nowrap' as React.CSSProperties['whiteSpace'],
              opacity: adding || !newInput.trim() || !newDate ? 0.6 : 1,
            }}
            onClick={handleAdd}
            disabled={adding || !newInput.trim() || !newDate}
          >
            {adding ? 'Wird hinzugefügt...' : 'Hinzufügen'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading && (
        <div style={styles.loadingBox}>Geplante Beiträge werden geladen...</div>
      )}

      {!loading && posts.length === 0 && (
        <div style={styles.emptyState}>
          Noch keine geplanten Beiträge. Erstelle deinen ersten oben.
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div style={styles.plannerList}>
          {posts.map((post) => (
            <div key={post.id} style={styles.plannerCard}>
              <div style={styles.plannerCardHeader}>
                <div style={styles.plannerCardMeta}>
                  <span style={styles.plannerDate}>
                    {formatDate(post.scheduledDate)}
                  </span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: getStatusColor(post.status),
                      color:
                        post.status === 'scheduled'
                          ? 'var(--color-text, #faf9f7)'
                          : '#000',
                    }}
                  >
                    {getStatusLabel(post.status)}
                  </span>
                  <span style={styles.plannerInputType}>
                    {post.inputType}
                  </span>
                </div>
                <div style={styles.plannerCardActions}>
                  {post.status === 'scheduled' && (
                    <button
                      type="button"
                      style={styles.editButton}
                      onClick={() => handleGenerate(post.id)}
                      disabled={actionLoading === post.id}
                    >
                      {actionLoading === post.id
                        ? 'Generiere...'
                        : 'Generieren'}
                    </button>
                  )}
                  {post.status === 'generated' && (
                    <button
                      type="button"
                      style={styles.saveButton}
                      onClick={() => handlePublish(post.id)}
                      disabled={actionLoading === post.id}
                    >
                      {actionLoading === post.id
                        ? 'Veröffentliche...'
                        : 'Veröffentlichen'}
                    </button>
                  )}
                  {post.status !== 'published' && (
                    <button
                      type="button"
                      style={styles.cancelButton}
                      onClick={() => handleDelete(post.id)}
                      disabled={actionLoading === post.id}
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>

              <div style={styles.plannerCardBody}>
                <div style={styles.plannerInput}>
                  <strong>Eingabe:</strong> {post.input}
                </div>

                {post.generatedTitle && (
                  <div style={styles.plannerPreview}>
                    <strong>Titel:</strong> {post.generatedTitle}
                    {post.generatedDescription && (
                      <>
                        <br />
                        <strong>Beschreibung:</strong>{' '}
                        {post.generatedDescription}
                      </>
                    )}
                  </div>
                )}

                {post.generatedImageData && (
                  <div style={styles.plannerImagePreview}>
                    <img
                      src={post.generatedImageData}
                      alt={post.generatedImageAlt || 'Generiertes Bild'}
                      style={styles.plannerImage}
                    />
                  </div>
                )}

                {post.publishedPath && (
                  <div style={styles.plannerPublishedPath}>
                    {post.publishedPath}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
