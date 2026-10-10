import { useState } from "react";
import logo from "../assets/logo.png";

export default function SupabaseAuthScreen({
  configured,
  onSignIn,
  initialError = "",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSignIn(email.trim(), password, rememberSession);
    } catch (signInError) {
      setError(signInError.message || "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="supabase-auth-screen">
      <section className="supabase-auth-card">
        <img src={logo} alt="" className="av-logo" />
        <p className="supabase-auth-eyebrow">GESTIÓN DE ENTRENAMIENTO</p>
        <h1>Arevs Method</h1>
        {!configured ? (
          <div className="supabase-auth-setup" role="alert">
            <strong>Falta configurar Supabase</strong>
            <p>
              Crea un archivo <code>.env.local</code> en la raíz del proyecto
              usando las variables de <code>.env.example</code>, y reinicia la
              aplicación. Revisa <code>SUPABASE_SETUP.md</code> para completar
              la conexión.
            </p>
          </div>
        ) : (
          <>
            <p className="supabase-auth-description">
              
            </p>
            <form className="supabase-auth-form" onSubmit={submit}>
              <label>
                Correo electrónico
                <input
                  autoComplete="username"
                  className="form-control"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  autoComplete="current-password"
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <label className="supabase-auth-remember">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) =>
                    setRememberSession(event.target.checked)
                  }
                />
                Mantener la sesión iniciada
              </label>
              {error && <p className="circuit-error" role="alert">{error}</p>}
              <button
                type="submit"
                className="circuit-primary-button"
                disabled={busy}
              >
                {busy ? "Conectando…" : "Iniciar sesión"}
              </button>
            </form>
            <p className="supabase-auth-footnote">
              El acceso es exclusivo para la cuenta administradora.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
