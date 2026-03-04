import { useState } from "react";
import { Zap, X } from "lucide-react";
import { supabase } from "../utils/supabase";

export const AuthModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // This automatically sends the verification email!
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Success! Check your email for the confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose(); // Close the modal instantly on successful login
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // This ensures Google kicks them back to your app after they click their account
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-app/80 backdrop-blur-sm px-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-inputcard border border-border-main rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-placeholder hover:text-card-text transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-8">
          <Zap size={36} className="text-accent fill-accent/20 mb-4" />
          <h1 className="text-3xl font-serif text-card-text tracking-tight">
            {isSignUp ? "Join Lumina" : "Sign in to continue"}
          </h1>
          <p className="text-placeholder text-sm mt-2 text-center">
            {isSignUp
              ? "Create an account to save chats and store your API keys."
              : "You've reached your guest limit. Sign in to keep chatting!"}
          </p>
        </div>

        {/* GOOGLE BUTTON */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-app border border-border-main hover:border-border-hover hover:bg-card-hover text-card-text transition-all rounded-xl py-2.5 text-[15px] font-medium mb-6 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border-main"></div>
          <span className="text-[12px] text-placeholder uppercase tracking-wider font-semibold">
            Or
          </span>
          <div className="h-px flex-1 bg-border-main"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-app border border-border-main rounded-xl px-4 py-3 text-[15px] text-primary outline-none focus:border-border-hover transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-app border border-border-main rounded-xl px-4 py-3 text-[15px] text-primary outline-none focus:border-border-hover transition-colors"
            />
          </div>

          {error && (
            <div className="text-[#FE8181] text-[13px] bg-[#FE8181]/10 p-3 rounded-lg">
              {error}
            </div>
          )}
          {message && (
            <div className="text-[#9be963] text-[13px] bg-[#9be963]/10 p-3 rounded-lg">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-user-bubble text-user-bubble-text hover:opacity-90 transition-opacity rounded-xl py-3 text-[15px] font-medium disabled:opacity-50 mt-2"
          >
            {loading
              ? "Authenticating..."
              : isSignUp
                ? "Sign Up with Email"
                : "Sign In with Email"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-placeholder hover:text-card-text-hover transition-colors text-[13px]"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
