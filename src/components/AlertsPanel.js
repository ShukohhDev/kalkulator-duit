/**
 * Alerts Panel Component (Pure Vanilla JS)
 */
export function renderAlertsPanel(container, { alerts = [], lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let dismissed = [];

  function render() {
    const visible = alerts.filter((alert) => !dismissed.includes(alert.id));
    if (visible.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <section class="card alert-card">
        <header class="card-head">
          <h2>${isEn ? 'Alerts' : 'Peringatan'}</h2>
          <span class="muted small">
            ${isEn ? 'calculated automatically from allocation & remaining funds' : 'dihitung otomatis dari alokasi & sisa uang'}
          </span>
        </header>
        <ul class="alert-list">
          ${visible.map((alert) => `
            <li class="alert alert-${alert.tone}">
              <span class="alert-icon" aria-hidden="true">!</span>
              <span class="alert-text">${alert.text}</span>
              <button
                type="button"
                class="alert-dismiss"
                data-id="${alert.id}"
                aria-label="${isEn ? `Dismiss alert ${alert.id}` : `Tutup peringatan ${alert.id}`}"
              >
                ×
              </button>
            </li>
          `).join('')}
        </ul>
      </section>
    `;

    container.querySelectorAll('.alert-dismiss').forEach((btn) => {
      btn.addEventListener('click', () => {
        dismissed.push(btn.dataset.id);
        render();
      });
    });
  }

  render();
}
