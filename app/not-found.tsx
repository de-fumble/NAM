import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 pt-14 text-center">
      <div className="text-[13px] font-semibold text-brand">404</div>
      <h1 className="headline mt-2 text-[44px]">This road doesn&apos;t go anywhere.</h1>
      <p className="mt-3 text-[17px] text-mute">The page you&apos;re looking for has moved, sold, or never existed.</p>
      <div className="mt-8 flex gap-3">
        <Button href="/">Go home</Button>
        <Button href="/cars" variant="secondary">Browse cars</Button>
      </div>
    </div>
  );
}
