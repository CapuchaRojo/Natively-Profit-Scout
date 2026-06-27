// ============================================================
// Account Comments Component (v1.0)
// ============================================================
import { useState } from 'react';
import type { ScoutComment, CommentType } from '../../types';

interface Props {
  comments: ScoutComment[];
  accountId: string;
  onAddComment: (comment: ScoutComment) => void;
}

const commentTypeLabels: Record<CommentType, string> = {
  general_note: 'General Note',
  call_note: 'Call Note',
  research_note: 'Research Note',
  willem_feedback: 'Willem Feedback',
  provider_note: 'Provider Note',
  client_note: 'Client Note',
  next_action: 'Next Action',
  risk: 'Risk',
  opportunity: 'Opportunity',
  hubspot_note: 'HubSpot Note',
};

export function AccountComments({ comments, accountId, onAddComment }: Props) {
  const [newBody, setNewBody] = useState('');
  const [newType, setNewType] = useState<CommentType>('general_note');
  const [newNextAction, setNewNextAction] = useState('');
  const [newNextActionDate, setNewNextActionDate] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = () => {
    if (!newBody.trim()) return;
    const now = new Date().toISOString();
    const comment: ScoutComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      accountId,
      createdAt: now,
      updatedAt: now,
      type: newType,
      body: newBody.trim(),
      nextAction: newNextAction.trim() || undefined,
      nextActionDate: newNextActionDate || undefined,
      visibility: 'internal',
    };
    onAddComment(comment);
    setNewBody('');
    setNewNextAction('');
    setNewNextActionDate('');
    setShowForm(false);
  };

  const handleCopyAsHubspotNote = (comment: ScoutComment) => {
    const text = `HubSpot Note — ${new Date().toISOString().slice(0, 10)}\nType: ${commentTypeLabels[comment.type]}\n\n${comment.body}${comment.nextAction ? `\n\nNext Action: ${comment.nextAction}${comment.nextActionDate ? ` (by ${comment.nextActionDate})` : ''}` : ''}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const sorted = [...comments].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
          💬 Comments ({comments.length})
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Note'}
        </button>
      </div>

      {showForm && (
        <div style={{
          padding: 12, background: '#0f1525', borderRadius: 6,
          border: '1px solid #2a3a5c', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ fontSize: 12, width: 160 }}
              value={newType}
              onChange={e => setNewType(e.target.value as CommentType)}
            >
              {Object.entries(commentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {newType === 'next_action' && (
              <>
                <input
                  className="input"
                  style={{ fontSize: 12, width: 200 }}
                  placeholder="Next action..."
                  value={newNextAction}
                  onChange={e => setNewNextAction(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ fontSize: 12, width: 150 }}
                  value={newNextActionDate}
                  onChange={e => setNewNextActionDate(e.target.value)}
                />
              </>
            )}
          </div>
          <textarea
            className="input"
            rows={3}
            style={{ fontSize: 12, marginBottom: 8 }}
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            placeholder="Write your note..."
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={!newBody.trim()}
          >
            Add Note
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
          No comments yet. Add your first note.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflow: 'auto' }}>
          {sorted.map(comment => (
            <div key={comment.id} style={{
              padding: '8px 10px', background: '#0f1525', borderRadius: 4,
              border: '1px solid #2a3a5c', fontSize: 11,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="badge" style={{
                    fontSize: 8, padding: '1px 6px',
                    background: comment.type === 'risk' ? 'rgba(239,68,68,0.12)' :
                      comment.type === 'opportunity' ? 'rgba(16,185,129,0.12)' :
                      comment.type === 'next_action' ? 'rgba(59,130,246,0.12)' :
                      comment.type === 'willem_feedback' ? 'rgba(168,85,247,0.12)' :
                      comment.type === 'provider_note' ? 'rgba(245,158,11,0.12)' :
                      'rgba(100,116,139,0.1)',
                    color: comment.type === 'risk' ? '#ef4444' :
                      comment.type === 'opportunity' ? '#10b981' :
                      comment.type === 'next_action' ? '#3b82f6' :
                      comment.type === 'willem_feedback' ? '#a855f7' :
                      comment.type === 'provider_note' ? '#f59e0b' :
                      '#94a3b8',
                  }}>
                    {commentTypeLabels[comment.type]}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 9 }}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 9, padding: '1px 6px' }}
                  onClick={() => handleCopyAsHubspotNote(comment)}
                  title="Copy as HubSpot note"
                >
                  📋 Copy
                </button>
              </div>
              <div style={{ color: '#94a3b8', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {comment.body}
              </div>
              {comment.nextAction && (
                <div style={{
                  marginTop: 6, padding: '4px 8px', background: 'rgba(59,130,246,0.06)',
                  borderRadius: 3, fontSize: 10, color: '#3b82f6',
                }}>
                  ▶ Next: {comment.nextAction}
                  {comment.nextActionDate && ` (by ${comment.nextActionDate})`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}