export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center" aria-busy="true" aria-label="불러오는 중">
      <div className="size-10 animate-pulse rounded-full bg-blue" aria-hidden />
    </div>
  );
}
