export const SUPABASE_AUTH_STORAGE_KEY = "arevs-method-auth";
export const REMEMBER_SESSION_STORAGE_KEY = "arevs-method-remember-session";

export const prepareSessionStorage = () => {
  const rememberSession =
    localStorage.getItem(REMEMBER_SESSION_STORAGE_KEY) === "true";
  const savedSession = rememberSession
    ? localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY)
    : null;

  localStorage.clear();
  if (rememberSession && savedSession) {
    localStorage.setItem(SUPABASE_AUTH_STORAGE_KEY, savedSession);
    localStorage.setItem(REMEMBER_SESSION_STORAGE_KEY, "true");
  }
};
