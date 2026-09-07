import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api/client';

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { identifier },
    }).catch(() => undefined);
    setSubmitting(false);
    setMessage('If the account exists, password reset instructions have been sent.');
  }

  return (
    <main className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Forgot Password</h1>

        {message && <p className="notice">{message}</p>}

        <label htmlFor="identifier">Email or Member Alias</label>
        <input
          id="identifier"
          name="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit'}
        </button>

        <Link to="/login">Back to sign in</Link>
      </form>
    </main>
  );
}
