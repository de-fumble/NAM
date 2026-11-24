"use client";

/**
 * Email + password accounts. One form drives the sign-in sheet and the /signin and /signup pages;
 * the email-link landing pages (/auth/callback, /auth/reset) live here too.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CarFront, CircleAlert, Cog, Eye, EyeOff, KeyRound, MailCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MIN_PASSWORD, cleanEmail, isEmail, normalizePhone, passwordProblem } from "@/lib/auth";
import { ROLE_META, type Role } from "@/lib/data/businesses";
import { STATES } from "@/lib/data/cars";
import { authApi } from "@/lib/sync";
import { toast, useApp, type User } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, Field, Input, Logo, Segmented, Select, Spinner, easeApple } from "./ui";

export const ROLE_ICON: Record<Role, typeof CarFront> = { customer: ShoppingBag, dealer: CarFront, rental: KeyRound, parts: Cog };

export type AuthMode = "signin" | "role" | "signup" | "verify" | "forgot" | "forgot-sent";

export const AUTH_TITLES: Record<AuthMode, string> = {
  signin: "Welcome back",
  role: "How will you use Naija Auto?",
  signup: "Create your account",
  verify: "Check your email",
  forgot: "Reset your password",
  "forgot-sent": "Check your email",
};

type Err = { message: string; code?: string } | null;

/** Signs the user in locally after the server has set the session cookie, and says hello. */
export function useFinishSignIn() {
  const signIn = useApp((s) => s.signIn);
  return (u: User, how: "signin" | "signup" | "confirm" | "reset" = "signin") => {
    signIn(u);
    const first = u.name.split(" ")[0];
    const title = how === "signup" ? `Welcome, ${first}` : how === "confirm" ? "Email confirmed" : how === "reset" ? "Password updated" : `Welcome back, ${first}`;
    toast({ title, body: u.role === "customer" ? "You're signed in." : "Your dashboard is ready.", tone: "success" });
  };
}

export function AuthForm({
  initial = "signin",
  presetRole = null,
  onDone,
  onMode,
}: {
  initial?: "signin" | "signup";
  presetRole?: Role | null;
  /** Called once the account is signed in. */
  onDone: (u: User) => void;
  onMode?: (m: AuthMode) => void;
}) {
  const finish = useFinishSignIn();
  const [mode, setModeState] = useState<AuthMode>(initial === "signup" ? (presetRole ? "signup" : "role") : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(presetRole ?? "customer");
  const [biz, setBiz] = useState({ name: "", city: "", state: "Lagos" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Err>(null);
  const [touched, setTouched] = useState(false);

  const setMode = (m: AuthMode) => {
    setModeState(m);
    setErr(null);
    setTouched(false);
    onMode?.(m);
  };
  useEffect(() => onMode?.(mode), []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ sign in ------------------------------ */
  const signIn = () =>
    run(async () => {
      const r = await authApi("signin", { email, password });
      if (!r.ok) return setErr({ message: r.error, code: r.code });
      if (r.local) return done({ name: cleanEmail(email).split("@")[0], phone: "+234 800 000 0000", role: "customer", email: cleanEmail(email) }, "signin");
      if (r.user) done(r.user, "signin");
    });

  /* ------------------------------ sign up ------------------------------ */
  const phoneOk = !!normalizePhone(phone);
  const pwProblem = passwordProblem(password);
  const signupValid = name.trim().length >= 2 && isEmail(email) && phoneOk && !pwProblem && (role === "customer" || biz.name.trim().length >= 2);
  const signUp = () => {
    setTouched(true);
    if (!signupValid) return;
    return run(async () => {
      const r = await authApi("signup", { name, email, password, phone, role, business: role === "customer" ? undefined : biz });
      if (!r.ok) return setErr({ message: r.error, code: r.code });
      if (r.local) return done({ name: name.trim(), phone: normalizePhone(phone), role, email: cleanEmail(email) }, "signup");
      if (r.verify) return setMode("verify");
      if (r.user) done(r.user, "signup");
    });
  };

  const done = (u: User, how: "signin" | "signup") => {
    finish(u, how);
    onDone(u);
  };

  /* ------------------------------ emails ------------------------------ */
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = () =>
    run(async () => {
      const r = await authApi("resend", { email });
      if (!r.ok) return setErr({ message: r.error, code: r.code });
      setCooldown(45);
      toast({ title: "Email sent", body: `Another link is on its way to ${cleanEmail(email)}.`, tone: "success" });
    });

  const forgot = () =>
    run(async () => {
      const r = await authApi("forgot", { email });
      if (!r.ok) return setErr({ message: r.error, code: r.code });
      setMode("forgot-sent");
    });

  const errBox = err && (
    <div role="alert" className="flex gap-2.5 rounded-2xl bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d18]">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {err.message}
        {err.code === "UNCONFIRMED" && (
          <button type="button" onClick={resend} disabled={cooldown > 0} className="mt-1 block font-medium text-[#8c1d18] underline disabled:no-underline disabled:opacity-60">
            {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend the confirmation email"}
          </button>
        )}
        {(err.code === "EXISTS" || err.code === "NO_PROFILE") && (
          <button type="button" onClick={() => setMode(err.code === "EXISTS" ? "signin" : presetRole ? "signup" : "role")} className="mt-1 block font-medium underline">
            {err.code === "EXISTS" ? "Sign in instead" : "Create an account"}
          </button>
        )}
      </div>
    </div>
  );

  const passwordInput = (autoComplete: string, placeholder: string) => (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="pr-12"
        aria-label="Password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-faint transition hover:text-ink"
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.25, ease: easeApple }}
      >
        {(mode === "signin" || mode === "role" || mode === "signup") && (
          <Segmented
            className="mb-6 w-full"
            value={mode === "signin" ? "signin" : "signup"}
            onChange={(v) => setMode(v === "signin" ? "signin" : presetRole ? "signup" : "role")}
            options={[
              { value: "signin", label: "Sign in" },
              { value: "signup", label: "Create account" },
            ]}
          />
        )}

        {mode === "signin" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isEmail(email) && password) signIn();
            }}
            className="space-y-4"
          >
            <Field label="Email">
              <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink-2">Password</span>
                <button type="button" onClick={() => setMode("forgot")} className="text-[13px] text-link">
                  Forgot password?
                </button>
              </div>
              {passwordInput("current-password", "Your password")}
            </div>
            {errBox}
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!isEmail(email) || !password}>
              Sign in
            </Button>
          </form>
        )}

        {mode === "role" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const Icon = ROLE_ICON[r];
                const on = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn("flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition", on ? "border-ink bg-white" : "border-hair hover:border-line")}
                  >
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition", on ? "bg-ink text-white" : "bg-mist")}>
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold">{r === "customer" ? "I'm buying" : ROLE_META[r].label}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-mute">{ROLE_META[r].blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Button className="mt-6 w-full" size="lg" onClick={() => setMode("signup")}>
              Continue
            </Button>
          </>
        )}

        {mode === "signup" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signUp();
            }}
            className="space-y-4"
            noValidate
          >
            {!presetRole && (
              <button type="button" onClick={() => setMode("role")} className="-mt-1 flex items-center gap-1.5 text-[13px] text-mute hover:text-ink">
                <ArrowLeft className="h-3.5 w-3.5" /> {role === "customer" ? "Buying" : ROLE_META[role].label} · change
              </button>
            )}
            <Field label="Full name">
              <Input autoComplete="name" placeholder="e.g. Adaeze Okonkwo" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <Field label="Email" hint="You'll sign in with this.">
              <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {touched && email && !isEmail(email) && <Hint>Check the email address.</Hint>}
            <Field label="Phone number" hint="So buyers and sellers can reach you. Shown only when you contact someone.">
              <div className="flex gap-2">
                <span className="grid h-12 shrink-0 place-items-center rounded-xl bg-mist px-3.5 text-[15px] font-medium">🇳🇬 +234</span>
                <Input inputMode="tel" autoComplete="tel-national" placeholder="803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d +]/g, "").slice(0, 16))} />
              </div>
            </Field>
            {touched && !phoneOk && <Hint>Enter a Nigerian mobile number, e.g. 0803 123 4567.</Hint>}
            {/* Not a <Field>: a <label> can't also wrap the show/hide button. */}
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Password</span>
              {passwordInput("new-password", "Create a password")}
              <span className="mt-1.5 block text-[12px] text-faint">At least {MIN_PASSWORD} characters, with letters and a number.</span>
            </div>
            {touched && pwProblem && <Hint>{pwProblem}</Hint>}
            {role !== "customer" && (
              <div className="space-y-4 rounded-2xl bg-mist p-4">
                <Field label="Business name" hint="Shown on your storefront. Add your CAC number later to get verified.">
                  <Input
                    className="bg-white"
                    placeholder={role === "dealer" ? "e.g. Lekki Motors" : role === "rental" ? "e.g. Prime Car Hire" : "e.g. Ladipo Auto Spares"}
                    value={biz.name}
                    onChange={(e) => setBiz({ ...biz, name: e.target.value })}
                  />
                </Field>
                {touched && biz.name.trim().length < 2 && <Hint>Enter your business name.</Hint>}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="State">
                    <Select className="bg-white" value={biz.state} onChange={(e) => setBiz({ ...biz, state: e.target.value })}>
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="City / area">
                    <Input className="bg-white" placeholder="e.g. Ikeja" value={biz.city} onChange={(e) => setBiz({ ...biz, city: e.target.value })} />
                  </Field>
                </div>
              </div>
            )}
            {errBox}
            <Button type="submit" size="lg" variant="brand" className="w-full" loading={busy}>
              {role === "customer" ? "Create account" : "Create business account"}
            </Button>
            <p className="text-center text-[12px] text-faint">By continuing you agree to our Terms and Privacy Policy.</p>
          </form>
        )}

        {mode === "verify" && (
          <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-brand" strokeWidth={1.4} />
            <p className="mt-4 text-[15px] text-ink-2">
              We sent a confirmation link to <b className="break-all">{cleanEmail(email)}</b>. Open it on this device to finish creating your account.
            </p>
            <p className="mt-2 text-[13px] text-mute">Can&apos;t find it? Check your spam or promotions folder.</p>
            {errBox && <div className="mt-4 text-left">{errBox}</div>}
            <div className="mt-6 flex flex-col gap-2">
              <Button size="lg" variant="secondary" loading={busy} disabled={cooldown > 0} onClick={resend}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setMode("signin")}>
                I&apos;ve confirmed, sign me in
              </Button>
            </div>
          </div>
        )}

        {mode === "forgot" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isEmail(email)) forgot();
            }}
            className="space-y-4"
          >
            <p className="text-[15px] text-mute">Enter the email you signed up with and we&apos;ll send you a link to choose a new password.</p>
            <Field label="Email">
              <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            {errBox}
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!isEmail(email)}>
              Send reset link
            </Button>
            <button type="button" onClick={() => setMode("signin")} className="flex w-full items-center justify-center gap-1.5 text-[14px] text-mute hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          </form>
        )}

        {mode === "forgot-sent" && (
          <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-brand" strokeWidth={1.4} />
            <p className="mt-4 text-[15px] text-ink-2">
              If there&apos;s an account for <b className="break-all">{cleanEmail(email)}</b>, a password reset link is on its way. It expires in an hour.
            </p>
            <Button size="lg" variant="secondary" className="mt-6 w-full" onClick={() => setMode("signin")}>
              Back to sign in
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="-mt-2 text-[13px] text-[#c4314b]">{children}</p>;
}

/* ------------------------------- full pages ------------------------------- */

function AuthCard({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-64px)] items-start justify-center px-4 pb-16 pt-[96px] sm:items-center sm:pt-[64px]">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-[28px] font-semibold tracking-tight">{title}</h1>
          {sub && <p className="mt-1 text-[15px] text-mute">{sub}</p>}
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] sm:p-8">{children}</div>
      </div>
    </div>
  );
}

const nextPath = () => {
  const n = new URLSearchParams(window.location.search).get("next") ?? "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "";
};
const homeFor = (u: User) => (u.role === "customer" ? "/" : "/dashboard");

export function AuthPage({ initial }: { initial: "signin" | "signup" }) {
  const router = useRouter();
  const user = useApp((s) => s.user);
  const [mode, setMode] = useState<AuthMode>(initial === "signup" ? "role" : "signin");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (ready && user)
    return (
      <AuthCard title="You're signed in" sub={<>as <b>{user.email ?? user.name}</b></>}>
        <div className="flex flex-col gap-2">
          <Button size="lg" href={homeFor(user)}>
            Continue
          </Button>
          <Button size="lg" variant="ghost" onClick={() => useApp.getState().signOut()}>
            Sign out
          </Button>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard title={AUTH_TITLES[mode]} sub={mode === "signin" ? "Sign in to buy, sell and message on Naija Auto." : undefined}>
      <AuthForm initial={initial} onMode={setMode} onDone={(u) => router.replace(nextPath() || homeFor(u))} />
    </AuthCard>
  );
}

/** Reads `#access_token=…` from an email link and removes it from the address bar straight away. */
function useLinkToken() {
  const [link, setLink] = useState<{ token?: string; type?: string; error?: string } | null>(null);
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const q = new URLSearchParams(window.location.search);
    setLink({
      token: h.get("access_token") ?? undefined,
      type: h.get("type") ?? q.get("type") ?? undefined,
      error: h.get("error_description") ?? q.get("error_description") ?? undefined,
    });
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  }, []);
  return link;
}

/** /auth/callback — where the sign-up confirmation email lands. */
export function AuthCallback() {
  const router = useRouter();
  const finish = useFinishSignIn();
  const link = useLinkToken();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!link) return;
    if (link.type === "recovery" && link.token) return void router.replace(`/auth/reset#access_token=${link.token}&type=recovery`);
    if (link.error || !link.token) return setError(link.error?.replace(/\+/g, " ") || "This link is missing its sign-in code. Open the newest email we sent you.");
    authApi("confirm", { token: link.token }).then((r) => {
      if (!r.ok || !r.user) return setError(r.ok ? "Something went wrong." : r.error);
      finish(r.user, "confirm");
      router.replace(homeFor(r.user));
    });
  }, [link]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthCard title={error ? "That link didn't work" : "Confirming your email…"}>
      {error ? (
        <>
          <p className="text-center text-[15px] text-mute">{error}</p>
          <Button size="lg" className="mt-6 w-full" href="/signin">
            Go to sign in
          </Button>
        </>
      ) : (
        <div className="flex justify-center py-6">
          <Spinner size={28} className="text-link" />
        </div>
      )}
    </AuthCard>
  );
}

/** /auth/reset — where the password reset email lands. */
export function ResetPassword() {
  const router = useRouter();
  const finish = useFinishSignIn();
  const link = useLinkToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const problem = passwordProblem(password);
  const mismatch = !!confirm && confirm !== password;

  if (link && (link.error || !link.token))
    return (
      <AuthCard title="That link didn't work">
        <p className="text-center text-[15px] text-mute">{link.error?.replace(/\+/g, " ") || "Reset links can only be used once and expire after an hour."}</p>
        <Button size="lg" className="mt-6 w-full" href="/signin">
          Request a new link
        </Button>
      </AuthCard>
    );

  return (
    <AuthCard title="Choose a new password">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (problem || mismatch || !link?.token) return;
          setBusy(true);
          const r = await authApi("reset", { token: link.token, password });
          setBusy(false);
          if (!r.ok || !r.user) return setError(r.ok ? "Something went wrong." : r.error);
          finish(r.user, "reset");
          router.replace(homeFor(r.user));
        }}
        className="space-y-4"
      >
        <Field label="New password" hint={`At least ${MIN_PASSWORD} characters, with letters and a number.`}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {mismatch && <Hint>The passwords don&apos;t match.</Hint>}
        {error && <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d18]">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!link?.token || !!problem || !confirm || mismatch}>
          Save password and sign in
        </Button>
        <p className="text-center text-[13px] text-mute">
          Remembered it? <Link href="/signin" className="text-link">Sign in</Link>
        </p>
      </form>
    </AuthCard>
  );
}

/** Email links fall back to the site's home page if /auth/* isn't in Supabase's redirect allow-list. Catch them anywhere. */
export function AuthLinkCatcher() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname.startsWith("/auth/") || !/access_token=|error_description=/.test(hash)) return;
    const recovery = /type=recovery/.test(hash);
    window.location.replace(`/auth/${recovery ? "reset" : "callback"}${hash}`);
  }, []);
  return null;
}
