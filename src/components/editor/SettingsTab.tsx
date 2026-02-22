import { useState, useEffect, useCallback } from 'react';
import type { Prompt, SettingsSubTab } from './types';
import { styles } from './styles';

const SUB_TABS: { key: SettingsSubTab; label: string }[] = [
  { key: 'homepage', label: 'Homepage' },
  { key: 'content-ai', label: 'Content-KI' },
  { key: 'analysis-ai', label: 'Analyse-KI' },
  { key: 'image-ai', label: 'Bild-KI' },
  { key: 'website', label: 'Website' },
];

interface EditState {
  id: string;
  value: string;
}

export function SettingsTab() {
  const [activeSubTab, setActiveSubTab] =
    useState<SettingsSubTab>('homepage');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts');
      if (!res.ok) throw new Error('Fehler beim Laden der Einstellungen');
      const data = await res.json();
      setPrompts(Array.isArray(data.prompts) ? data.prompts : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const filteredPrompts = prompts.filter(
    (p) => p.category === activeSubTab,
  );

  const handleEdit = (prompt: Prompt) => {
    setEditing({ id: prompt.id, value: prompt.promptText });
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          promptText: editing.value,
        }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, promptText: editing.value } : p,
        ),
      );
      setEditing(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Speichern',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.settingsContent}>
      <div style={styles.subTabNav} role="tablist">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeSubTab === tab.key}
            style={
              activeSubTab === tab.key
                ? styles.subTabActive
                : styles.subTab
            }
            onClick={() => {
              setActiveSubTab(tab.key);
              setEditing(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={styles.loadingBox}>Einstellungen werden geladen...</div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {!loading && filteredPrompts.length === 0 && (
        <div style={styles.emptyState}>
          Keine Einstellungen in dieser Kategorie.
        </div>
      )}

      {!loading && filteredPrompts.length > 0 && (
        <div style={styles.cardGrid}>
          {filteredPrompts.map((prompt) => (
            <div key={prompt.id} style={styles.settingsCard}>
              <div style={styles.settingsCardHeader}>
                <div style={styles.settingsItemLabel}>{prompt.name}</div>
                <div style={styles.settingsItemCategory}>
                  {prompt.category}
                </div>
              </div>

              {editing?.id === prompt.id ? (
                <div style={styles.editArea}>
                  <textarea
                    style={styles.textarea}
                    value={editing.value}
                    onChange={(e) =>
                      setEditing({ ...editing, value: e.target.value })
                    }
                  />
                  <div style={styles.editButtons}>
                    <button
                      type="button"
                      style={styles.saveButton}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Speichere...' : 'Speichern'}
                    </button>
                    <button
                      type="button"
                      style={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles.settingsItemValue}>
                    {prompt.promptText}
                  </div>
                  <div style={{ padding: '0 1rem 1rem' }}>
                    <button
                      type="button"
                      style={styles.editButton}
                      onClick={() => handleEdit(prompt)}
                    >
                      Bearbeiten
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
