import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Circle,
  CircleDot,
  Clock,
  Code,
  FileText,
  LifeBuoy,
  MessageSquare,
  Paperclip,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldCheck,
  StickyNote,
  User,
  Users,
  X
} from 'lucide-react';
import { HELP_CATEGORIES, HELP_ARTICLES, FAQ_ITEMS, type HelpArticle } from '../../data/helpContent';
import type { AdminUser } from '../../types';

const ICONS: Record<string, React.ComponentType<any>> = {
  Rocket, MessageSquare, Send, Clock, User, Users, FileText, Paperclip,
  StickyNote, CircleDot, ShieldCheck, Settings, LifeBuoy, Code
};

interface HelpCenterProps {
  currentUser?: AdminUser | null;
}

type HelpView =
  | { kind: 'home' }
  | { kind: 'category'; categoryId: string }
  | { kind: 'article'; articleId: string }
  | { kind: 'faq' }
  | { kind: 'search'; query: string };

const searchableText = (a: HelpArticle) =>
  [a.title, a.description, a.whenToUse, a.whatHappensNext, ...(a.steps || []), ...(a.commonProblems || []), ...a.keywords]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const HelpCenter: React.FC<HelpCenterProps> = ({ currentUser }) => {
  const location = useLocation();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const deepLinkedArticleId = (location.state as { articleId?: string } | null)?.articleId;
  const [view, setView] = React.useState<HelpView>(
    deepLinkedArticleId ? { kind: 'article', articleId: deepLinkedArticleId } : { kind: 'home' }
  );
  const [query, setQuery] = React.useState('');

  // Support being linked to a specific article from elsewhere in the app (e.g. a "Why?" link)
  React.useEffect(() => {
    if (deepLinkedArticleId) {
      setView({ kind: 'article', articleId: deepLinkedArticleId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkedArticleId]);

  const visibleCategories = HELP_CATEGORIES.filter(c => !c.visibility || c.visibility === 'staff' || isSuperAdmin);
  const visibleArticles = HELP_ARTICLES.filter(a => !a.visibility || a.visibility === 'staff' || isSuperAdmin);
  const visibleFaq = FAQ_ITEMS.filter(f => !f.visibility || f.visibility === 'staff' || isSuperAdmin);

  const goHome = () => {
    setView({ kind: 'home' });
    setQuery('');
  };

  const openArticle = (articleId: string) => setView({ kind: 'article', articleId });
  const openCategory = (categoryId: string) => setView({ kind: 'category', categoryId });

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (val.trim().length >= 2) {
      setView({ kind: 'search', query: val.trim() });
    } else if (view.kind === 'search') {
      setView({ kind: 'home' });
    }
  };

  const searchResults = React.useMemo(() => {
    if (view.kind !== 'search') return [];
    const q = view.query.toLowerCase();
    return visibleArticles
      .map(a => {
        const text = searchableText(a);
        let score = 0;
        if (a.title.toLowerCase().includes(q)) score += 3;
        if (a.keywords.some(k => k.toLowerCase().includes(q))) score += 2;
        if (text.includes(q)) score += 1;
        return { article: a, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.article);
  }, [view, visibleArticles]);

  const currentArticle = view.kind === 'article' ? visibleArticles.find(a => a.id === view.articleId) : null;
  const currentCategory = view.kind === 'category' ? visibleCategories.find(c => c.id === view.categoryId) : null;

  return (
    <div className="help-center-view">
      <div className="help-center-header">
        <div>
          <h1 className="config-page-title">Help Center</h1>
          <p className="help-center-subtitle">Quick answers for using the Support Center.</p>
        </div>
      </div>

      <div className="help-search-wrapper">
        <Search size={16} className="help-search-icon" />
        <input
          type="text"
          className="help-search-input"
          placeholder="Search help articles..."
          value={query}
          onChange={e => handleSearchChange(e.target.value)}
        />
        {query && (
          <button type="button" className="help-search-clear" onClick={goHome} title="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {view.kind !== 'home' && view.kind !== 'search' && (
        <button type="button" className="help-back-link" onClick={goHome}>
          <ArrowLeft size={13} /> Back to Help Center
        </button>
      )}

      {view.kind === 'search' && (
        <div className="help-search-results">
          <div className="help-section-label">
            {searchResults.length > 0 ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}` : 'No results'}
          </div>
          {searchResults.map(a => (
            <button type="button" key={a.id} className="help-search-result-item" onClick={() => openArticle(a.id)}>
              <span className="help-search-result-title">{a.title}</span>
              <span className="help-search-result-desc">{a.description}</span>
            </button>
          ))}
          {searchResults.length === 0 && (
            <div className="help-empty-state">Try a different search term, or browse a category below.</div>
          )}
        </div>
      )}

      {view.kind === 'home' && (
        <>
          <div className="help-section-label">Popular Topics</div>
          <div className="help-category-grid">
            {visibleCategories.map(cat => (
              <button type="button" key={cat.id} className="help-category-card" onClick={() => openCategory(cat.id)}>
                <span className="help-category-icon">
                  {React.createElement(ICONS[cat.icon] || Circle, { size: 18 })}
                </span>
                <span className="help-category-title">{cat.title}</span>
                <span className="help-category-desc">{cat.description}</span>
              </button>
            ))}
            <button type="button" className="help-category-card" onClick={() => setView({ kind: 'faq' })}>
              <span className="help-category-icon">
                <MessageSquare size={18} />
              </span>
              <span className="help-category-title">FAQ</span>
              <span className="help-category-desc">Frequently asked questions</span>
            </button>
          </div>
        </>
      )}

      {view.kind === 'category' && currentCategory && (
        <div className="help-article-list">
          <div className="help-section-label">{currentCategory.title}</div>
          {visibleArticles.filter(a => a.categoryId === currentCategory.id).map(a => (
            <button type="button" key={a.id} className="help-search-result-item" onClick={() => openArticle(a.id)}>
              <span className="help-search-result-title">{a.title}</span>
              <span className="help-search-result-desc">{a.description}</span>
            </button>
          ))}
        </div>
      )}

      {view.kind === 'faq' && (
        <div className="help-faq-list">
          <div className="help-section-label">Frequently Asked Questions</div>
          {visibleFaq.map(f => (
            <div className="help-faq-item" key={f.id}>
              <div className="help-faq-question">{f.question}</div>
              <div className="help-faq-answer">{f.answer}</div>
            </div>
          ))}
        </div>
      )}

      {view.kind === 'article' && currentArticle && (
        <div className="help-article-detail">
          <h2 className="help-article-title">{currentArticle.title}</h2>
          <p className="help-article-description">{currentArticle.description}</p>

          {currentArticle.whenToUse && (
            <div className="help-article-section">
              <div className="help-article-section-label">When you need this</div>
              <p>{currentArticle.whenToUse}</p>
            </div>
          )}

          {currentArticle.steps && currentArticle.steps.length > 0 && (
            <div className="help-article-section">
              <div className="help-article-section-label">Steps</div>
              <ol className="help-article-steps">
                {currentArticle.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          {currentArticle.whatHappensNext && (
            <div className="help-article-section">
              <div className="help-article-section-label">What happens next</div>
              <p>{currentArticle.whatHappensNext}</p>
            </div>
          )}

          {currentArticle.commonProblems && currentArticle.commonProblems.length > 0 && (
            <div className="help-article-section help-article-callout">
              <div className="help-article-section-label">Common problems</div>
              <ul className="help-article-bullets">
                {currentArticle.commonProblems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {currentArticle.relatedArticleIds && currentArticle.relatedArticleIds.length > 0 && (
            <div className="help-article-section">
              <div className="help-article-section-label">Related articles</div>
              <div className="help-related-list">
                {currentArticle.relatedArticleIds
                  .map(id => visibleArticles.find(a => a.id === id))
                  .filter((a): a is HelpArticle => Boolean(a))
                  .map(a => (
                    <button type="button" key={a.id} className="help-related-link" onClick={() => openArticle(a.id)}>
                      {a.title}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
