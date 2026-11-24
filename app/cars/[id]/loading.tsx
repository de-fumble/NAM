export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-[94px] sm:px-8">
      <div className="shimmer h-4 w-48 rounded-md" />
      <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="shimmer aspect-[16/11] rounded-[28px]" />
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer aspect-[4/3] rounded-2xl" />)}
          </div>
        </div>
        <div className="shimmer h-[460px] rounded-[28px]" />
      </div>
    </div>
  );
}
