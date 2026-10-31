import { useState } from 'react';
import { changePassword } from '../lib/auth';
import { useI18n } from '../lib/i18n';
const LockIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>);
export function AccountSecurityCard({ username, notify }) {
    const { language } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        if (!oldPassword) {
            setErrorMessage(language === 'en' ? 'Current password is required.' : 'Kata sandi saat ini harus diisi.');
            return;
        }
        if (newPassword.length < 4) {
            setErrorMessage(language === 'en' ? 'New password must be at least 4 characters.' : 'Kata sandi baru minimal 4 karakter.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMessage(language === 'en' ? 'New password confirmation does not match.' : 'Konfirmasi kata sandi baru tidak cocok.');
            return;
        }
        setLoading(true);
        const err = await changePassword(username, oldPassword, newPassword);
        setLoading(false);
        if (err) {
            setErrorMessage(err);
            notify(err, { error: true });
        }
        else {
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsOpen(false);
            notify(language === 'en' ? 'Account password updated successfully!' : 'Kata sandi akun berhasil diperbarui!');
        }
    };
    return (<section className="card account-security-card" aria-label={language === 'en' ? 'Account Security' : 'Keamanan Akun'}>
      <header className="card-head">
        <div className="security-title-wrap">
          <span className="security-icon">
            <LockIcon />
          </span>
          <div>
            <h3>{language === 'en' ? 'Account Security' : 'Keamanan Akun'}</h3>
            <span className="muted small">
              {language === 'en' ? `Manage password for ${username}` : `Kelola kata sandi akun ${username}`}
            </span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
            setIsOpen(!isOpen);
            setErrorMessage('');
        }}>
          {isOpen
            ? (language === 'en' ? 'Close' : 'Tutup')
            : (language === 'en' ? 'Change Password' : 'Ubah Kata Sandi')}
        </button>
      </header>

      {isOpen && (<form onSubmit={handleSubmit} className="security-form">
          <div className="field">
            <label htmlFor="old-pass">{language === 'en' ? 'Current Password' : 'Kata Sandi Saat Ini'}</label>
            <input id="old-pass" className="input" type="password" placeholder={language === 'en' ? 'Enter current password' : 'Masukkan kata sandi lama'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} disabled={loading} autoComplete="current-password"/>
          </div>

          <div className="field">
            <label htmlFor="new-pass">{language === 'en' ? 'New Password' : 'Kata Sandi Baru'}</label>
            <input id="new-pass" className="input" type="password" placeholder={language === 'en' ? 'At least 4 characters' : 'Minimal 4 karakter'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} autoComplete="new-password"/>
          </div>

          <div className="field">
            <label htmlFor="confirm-pass">{language === 'en' ? 'Confirm New Password' : 'Konfirmasi Kata Sandi Baru'}</label>
            <input id="confirm-pass" className="input" type="password" placeholder={language === 'en' ? 'Repeat new password' : 'Ulangi kata sandi baru'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} autoComplete="new-password"/>
          </div>

          {errorMessage && <p className="text-danger small">{errorMessage}</p>}

          <div className="security-form-actions">
            <button type="submit" className="btn btn-sm" disabled={loading}>
              {loading
                ? (language === 'en' ? 'Saving...' : 'Menyimpan...')
                : (language === 'en' ? 'Save Password' : 'Simpan Kata Sandi')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                setIsOpen(false);
                setErrorMessage('');
            }} disabled={loading}>
              {language === 'en' ? 'Cancel' : 'Batal'}
            </button>
          </div>
        </form>)}
    </section>);
}
