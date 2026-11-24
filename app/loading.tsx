export default function Loading() {
  return (
    <div className="grid min-h-[70vh] place-items-center pt-[64px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Loading" width={110} className="animate-breathe select-none" draggable={false} />
    </div>
  );
}
