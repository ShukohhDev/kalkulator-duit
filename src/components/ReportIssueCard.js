/**
 * Report Issue Card Component (Pure Vanilla JS)
 */
import { sendUserReport } from '../lib/reports.js';
import { currentUser } from '../lib/auth.js';
import { escapeHtml } from '../lib/dom.js';

const TYPES = [
  { value: 'Bug', labelId: 'Bug', labelEn: 'Bug' },
  { value: 'Kritik', labelId: 'Kritik', labelEn: 'Critique' },
  { value: 'Saran', labelId: 'Saran', labelEn: 'Suggestion' },
];

function currentSection() {
  const active = document.querySelector('.section.active h1, .section.active h2, .section.active h3');
  const fallback = document.getElementById(location.hash.slice(1))?.querySelector('h1, h2, h3');
  return (active ?? fallback)?.textContent?.trim() ?? 'beranda';
}

export function renderReportIssueCard(container, { notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let type = 'Bug';
  let message = '';
  let page = '';
  let honeypot = '';
  let lastSubmitTime = 0;
  let submitting = false;

  async function handleSend() {
    if (honeypot) {
      notify?.(isEn ? 'Report processed.' : 'Laporan diproses.');
      return;
    }

    const now = Date.now();
    if (now - lastSubmitTime < 5000) {
      notify?.(
        isEn
          ? 'Please wait a few seconds before sending another report.'
          : 'Mohon tunggu beberapa detik sebelum mengirim laporan lagi.',
        { error: true }
      );
      return;
    }

    if (!message.trim()) {
      notify?.(isEn ? 'Please describe the issue first.' : 'Tulis dulu masalahnya.', { error: true });
      return;
    }

    submitting = true;
    render();
    try {
      const username = currentUser() || (isEn ? 'Anonymous' : 'Anonim');
      const err = await sendUserReport({
        username,
        type,
        page: page.trim() || currentSection(),
        message: message.trim(),
      });

      if (err) {
        notify?.(err, { error: true });
      } else {
        notify?.(
          isEn
            ? 'Report sent to administrator successfully!'
            : 'Laporan berhasil dikirim ke pemilik website!'
        );
        message = '';
        page = '';
        lastSubmitTime = now;
      }
    } catch {
      notify?.(isEn ? 'Failed to send report.' : 'Gagal mengirim laporan.', { error: true });
    } finally {
      submitting = false;
      render();
    }
  }

  async function copy() {
    if (!message.trim()) {
      notify?.(isEn ? 'Please describe the issue first.' : 'Tulis dulu masalahnya.', { error: true });
      return;
    }
    const template = [
      `[${type}] Kalkulator Uang Jajan`,
      `Browser: ${navigator.userAgent}`,
      `Halaman: ${page.trim() || currentSection()}`,
      '',
      `Pesan: ${message.trim()}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(template);
      notify?.(
        isEn
          ? 'Report copied to clipboard. Paste to GitHub Issues.'
          : 'Laporan disalin ke clipboard. Tempel ke GitHub Issues.'
      );
    } catch {
      notify?.(isEn ? 'Failed to copy report' : 'Gagal menyalin laporan', { error: true });
    }
  }

  function render() {
    container.innerHTML = `
      <section class="card report-issue-card" aria-label="${isEn ? 'Report an Issue' : 'Laporkan Masalah'}">
        <header class="card-head">
          <h2>${isEn ? 'Report an Issue' : 'Laporkan Masalah'}</h2>
        </header>
        <div class="form-grid">
          <div class="field">
            <label for="issue-type">${isEn ? 'Type' : 'Jenis'}</label>
            <select
              id="issue-type"
              class="input"
              title="${isEn ? 'Select Issue Type' : 'Pilih Jenis Laporan'}"
            >
              ${TYPES.map((item) => `
                <option value="${item.value}"${item.value === type ? ' selected' : ''}>
                  ${isEn ? item.labelEn : item.labelId}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="field">
            <label for="issue-page">${isEn ? 'Page (optional)' : 'Halaman (opsional)'}</label>
            <input
              id="issue-page"
              class="input"
              placeholder="${isEn ? 'automatic: active page' : 'otomatis: halaman aktif'}"
              value="${escapeHtml(page)}"
            />
          </div>
          <div class="field">
            <label for="issue-message">${isEn ? 'Describe the issue' : 'Ceritakan masalahnya'}</label>
            <textarea
              id="issue-message"
              class="input"
              rows="4"
              placeholder="${isEn ? 'Found a bug, critique, or have an idea? Describe what happened and steps to reproduce...' : 'Ada bug, kritik, atau ide baru nih? Ceritakan apa yang terjadi dan langkah-langkahnya ya...'}"
            >${escapeHtml(message)}</textarea>
          </div>
          <div style="display: none;" aria-hidden="true">
            <label for="issue-website">Website</label>
            <input
              id="issue-website"
              type="text"
              value="${escapeHtml(honeypot)}"
              tabindex="-1"
              autocomplete="off"
            />
          </div>
          <div class="form-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-send-report" ${submitting ? 'disabled' : ''}>${submitting ? (isEn ? 'Sending...' : 'Mengirim...') : (isEn ? 'Send Report' : 'Kirim Laporan')}</button>
            <button type="button" class="btn btn-secondary btn-copy-report">${isEn ? 'Copy report' : 'Salin laporan'}</button>
          </div>
        </div>
        <p class="muted small">
          ${isEn ? 'Your report will be sent directly to the site administrator, or you can copy the text.' : 'Laporanmu bakal langsung masuk ke admin website ini, atau kamu juga bisa salin teksnya.'}
        </p>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.report-issue-card');
    if (!root) return;

    root.querySelector('#issue-type')?.addEventListener('change', (e) => {
      type = e.target.value;
    });

    root.querySelector('#issue-page')?.addEventListener('input', (e) => {
      page = e.target.value;
    });

    root.querySelector('#issue-message')?.addEventListener('input', (e) => {
      message = e.target.value;
    });

    root.querySelector('#issue-website')?.addEventListener('input', (e) => {
      honeypot = e.target.value;
    });

    root.querySelector('.btn-send-report')?.addEventListener('click', handleSend);
    root.querySelector('.btn-copy-report')?.addEventListener('click', copy);
  }

  render();
}

