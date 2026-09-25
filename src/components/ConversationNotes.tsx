import React from 'react';
import { MoreVertical, Pencil, StickyNote, Trash2, X } from 'lucide-react';
import { API_BASE } from '../constants';
import { wsService } from '../services/websocket';
import type { AdminUser, ConversationNote } from '../types';

interface ConversationNotesProps {
  conversationId: string;
  currentUser?: AdminUser | null;
  getAuthHeaders: () => Record<string, string>;
  /** Optional controlled open state, e.g. when the panel is opened from a mobile actions menu. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in "Note" button (the caller provides its own trigger). */
  hideTrigger?: boolean;
}

const formatNoteTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (d.toDateString() === now.toDateString()) return `Today · ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;

  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
};

export const ConversationNotes: React.FC<ConversationNotesProps> = ({
  conversationId,
  currentUser,
  getAuthHeaders,
  open,
  onOpenChange,
  hideTrigger = false
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(isOpen) : next;
    if (open === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };
  const [notes, setNotes] = React.useState<ConversationNote[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState('');
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const applyCreated = (note: ConversationNote) => {
    setNotes(prev => (prev.some(n => n.id === note.id) ? prev : [note, ...prev]));
  };
  const applyUpdated = (note: ConversationNote) => {
    setNotes(prev => prev.map(n => (n.id === note.id ? note : n)));
  };
  const applyDeleted = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${conversationId}/notes`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotes(data.notes || []);
      } else {
        setError(data.error || 'Failed to load notes');
      }
    } catch (e) {
      setError('Network error loading notes');
    } finally {
      setLoading(false);
    }
  };

  // Reset all transient UI state whenever the conversation changes
  React.useEffect(() => {
    setIsOpen(false);
    setNotes([]);
    setDraft('');
    setEditingId(null);
    setMenuOpenId(null);
    setConfirmDeleteId(null);
  }, [conversationId]);

  React.useEffect(() => {
    if (isOpen) loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conversationId]);

  // Live updates from teammates working the same conversation
  React.useEffect(() => {
    const unsubCreated = wsService.on('note:created', (data: any) => {
      if (data?.conversationId === conversationId && data.note) applyCreated(data.note);
    });
    const unsubUpdated = wsService.on('note:updated', (data: any) => {
      if (data?.conversationId === conversationId && data.note) applyUpdated(data.note);
    });
    const unsubDeleted = wsService.on('note:deleted', (data: any) => {
      if (data?.conversationId === conversationId && data.noteId) applyDeleted(data.noteId);
    });
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [conversationId]);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // [data-notes-trigger] marks an external opener (e.g. the mobile actions menu item).
      if (!target.closest('.notes-dropdown, [data-notes-trigger]')) {
        setIsOpen(false);
        setMenuOpenId(null);
      } else if (!target.closest('.note-item-menu-container')) {
        setMenuOpenId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setMenuOpenId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleAddNote = async () => {
    const content = draft.trim();
    if (!content) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        applyCreated(data.note);
        setDraft('');
      } else {
        alert(data.error || 'Failed to add note');
      }
    } catch (e) {
      alert('Error adding note');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (note: ConversationNote) => {
    setEditingId(note.id);
    setEditDraft(note.content);
    setMenuOpenId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async (noteId: string) => {
    const content = editDraft.trim();
    if (!content) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${conversationId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        applyUpdated(data.note);
        cancelEdit();
      } else {
        alert(data.error || 'Failed to update note');
      }
    } catch (e) {
      alert('Error updating note');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const performDelete = async (noteId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${conversationId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        applyDeleted(noteId);
        setConfirmDeleteId(null);
      } else {
        alert(data.error || 'Failed to delete note');
      }
    } catch (e) {
      alert('Error deleting note');
    } finally {
      setIsDeleting(false);
    }
  };

  const canManage = (note: ConversationNote) =>
    currentUser?.role === 'super_admin' || note.authorId === currentUser?.id;

  return (
    <div className="notes-dropdown">
      {!hideTrigger && (
        <button
          type="button"
          className={`btn-reassign-header ${notes.length > 0 ? 'has-note' : ''}`}
          onClick={() => setIsOpen(prev => !prev)}
          title="Internal notes (staff only)"
        >
          <StickyNote size={13} />
          <span>{notes.length > 0 ? `Note ${notes.length}` : 'Note'}</span>
        </button>
      )}

      {isOpen && (
        <div className="notes-panel">
          <div className="notes-panel-header">
            <span className="notes-panel-title-group">
              Internal Notes
              <span className="notes-panel-privacy-hint" title="Notes are never sent to the customer">
                🔒 Private to staff
              </span>
            </span>
            <button type="button" className="notes-panel-close" onClick={() => setIsOpen(false)} title="Close">
              <X size={15} />
            </button>
          </div>

          <div className="notes-panel-list">
            {loading ? (
              <div className="notes-empty-state">Loading notes...</div>
            ) : error ? (
              <div className="notes-empty-state notes-error">{error}</div>
            ) : notes.length === 0 ? (
              <div className="notes-empty-state">No internal notes yet.</div>
            ) : (
              notes.map(note => (
                <div className="note-item" key={note.id}>
                  {confirmDeleteId === note.id ? (
                    <div className="note-delete-confirm">
                      <div className="note-delete-confirm-title">Delete this note?</div>
                      <div className="note-delete-confirm-desc">This note will be permanently removed.</div>
                      <div className="note-delete-confirm-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-delete-note"
                          onClick={() => performDelete(note.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : editingId === note.id ? (
                    <div className="note-edit-form">
                      <textarea
                        className="note-edit-textarea"
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        autoFocus
                      />
                      <div className="note-edit-actions">
                        <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={isSavingEdit}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-save-note"
                          onClick={() => saveEdit(note.id)}
                          disabled={isSavingEdit || !editDraft.trim()}
                        >
                          {isSavingEdit ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="note-item-header">
                        <span className="note-item-icon">📝</span>
                        <span className="note-item-label">Internal note</span>
                        {canManage(note) && (
                          <div className="note-item-menu-container">
                            <button
                              type="button"
                              className="note-item-menu-btn"
                              onClick={() => setMenuOpenId(prev => (prev === note.id ? null : note.id))}
                              title="Note options"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {menuOpenId === note.id && (
                              <div className="note-item-menu">
                                <button type="button" className="note-item-menu-option" onClick={() => startEdit(note)}>
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="note-item-menu-option danger"
                                  onClick={() => {
                                    setConfirmDeleteId(note.id);
                                    setMenuOpenId(null);
                                  }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="note-item-content">{note.content}</div>
                      <div className="note-item-meta">
                        {note.authorName}
                        {note.updatedAt !== note.createdAt ? ' · edited' : ''} · {formatNoteTime(note.createdAt)}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="notes-panel-composer">
            <textarea
              className="notes-composer-textarea"
              placeholder="Add an internal note..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={2}
              maxLength={2000}
            />
            <div className="notes-composer-actions">
              <span className="notes-composer-hint">Only your team can see this</span>
              <button
                type="button"
                className="btn-save-note"
                onClick={handleAddNote}
                disabled={isSaving || !draft.trim()}
              >
                {isSaving ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
