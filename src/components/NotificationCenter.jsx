import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ICON_CLOSE } from './icons';
import { useI18n } from '../lib/i18n';
import { lockBodyScroll } from '../lib/scrollLock';
export function NotificationCenter({ items, onClose, onMarkAllRead, onMarkRead }) {
    const { language } = useI18n();
    const [filter, setFilter] = useState('all');
    const filteredItems = items.filter((item) => {
        if (filter === 'finance')
            return item.kind === 'finance';
        if (filter === 'reports')
            return item.kind === 'admin_reply' || item.kind === 'report_status';
        return true;
    });
    const unreadCount = items.filter((item) => !item.read).length;
    useEffect(() => {
        return lockBodyScroll();
    }, []);
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);
    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        catch {
            return isoString;
        }
    };
    const content = (<>
      <div className="notif-backdrop" onClick={onClose} aria-hidden="true"/>
      <div className="notif-dropdown card" role="region" aria-label={language === 'en' ? 'Notification Center' : 'Pusat Notifikasi'} onClick={(e) => e.stopPropagation()}>
        <div className="notif-mobile-handle"/>

        <div className="notif-header">
          <div className="notif-title-group">
            <h3>{language === 'en' ? 'Updates & Notifications' : 'Kabar & Notifikasi'}</h3>
            {unreadCount > 0 && (<span className="notif-count-badge">
                {unreadCount} {language === 'en' ? 'new' : 'baru'}
              </span>)}
          </div>
          <div className="notif-actions">
            {unreadCount > 0 && (<button type="button" className="btn btn-ghost btn-sm notif-btn-action" onClick={onMarkAllRead}>
                {language === 'en' ? 'Mark all as read' : 'Tandai sudah dibaca'}
              </button>)}
            <button type="button" className="btn btn-ghost btn-sm notif-close" onClick={onClose} aria-label={language === 'en' ? 'Close notifications' : 'Tutup notifikasi'}>
              {ICON_CLOSE}
            </button>
          </div>
        </div>

        <div className="notif-tabs">
          <button type="button" className={`notif-tab${filter === 'all' ? ' notif-tab-active' : ''}`} onClick={() => setFilter('all')}>
            {language === 'en' ? `All (${items.length})` : `Semua (${items.length})`}
          </button>
          <button type="button" className={`notif-tab${filter === 'finance' ? ' notif-tab-active' : ''}`} onClick={() => setFilter('finance')}>
            {language === 'en'
            ? `Finance (${items.filter((i) => i.kind === 'finance').length})`
            : `Keuangan (${items.filter((i) => i.kind === 'finance').length})`}
          </button>
          <button type="button" className={`notif-tab${filter === 'reports' ? ' notif-tab-active' : ''}`} onClick={() => setFilter('reports')}>
            {language === 'en'
            ? `Reports & Replies (${items.filter((i) => i.kind !== 'finance').length})`
            : `Laporan & Balasan (${items.filter((i) => i.kind !== 'finance').length})`}
          </button>
        </div>

        <div className="notif-list">
          {filteredItems.length === 0 ? (<div className="notif-empty">
              <p className="muted">
                {language === 'en'
                ? 'No notifications in this category.'
                : 'Belum ada notifikasi baru di kategori ini.'}
              </p>
            </div>) : (filteredItems.map((item) => {
            const isUnread = !item.read;
            const tagClass = item.kind === 'admin_reply'
                ? 'notif-tag-reply'
                : item.kind === 'report_status'
                    ? 'notif-tag-status'
                    : 'notif-tag-finance';
            return (<div key={item.id} className={`notif-item${isUnread ? ' notif-item-unread' : ''}`} onClick={() => {
                    if (isUnread)
                        onMarkRead(item.id);
                }}>
                  <div className="notif-item-top">
                    <span className={`notif-tag ${tagClass}`}>{item.tag}</span>
                    <span className="notif-time muted small">{formatDate(item.timestamp)}</span>
                    {isUnread && (<span className="notif-unread-dot" title={language === 'en' ? 'Unread' : 'Belum dibaca'}/>)}
                  </div>
                  <h4 className="notif-item-title">{item.title}</h4>
                  <p className="notif-item-msg">{item.message}</p>
                  {item.metadata?.status && (<div className="notif-item-status-pill">
                      Status:{' '}
                      <strong>
                        {item.metadata.status === 'selesai'
                        ? language === 'en' ? 'Resolved' : 'Selesai'
                        : item.metadata.status === 'diproses'
                            ? language === 'en' ? 'In Progress' : 'Diproses'
                            : language === 'en' ? 'New' : 'Baru'}
                      </strong>
                    </div>)}
                </div>);
        }))}
        </div>
      </div>
    </>);
    if (typeof document === 'undefined')
        return null;
    return createPortal(content, document.body);
}
