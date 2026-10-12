import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[18px] font-extrabold">없는 페이지입니다</p>
      <Link href="/" className="min-h-[44px] text-[14px] font-bold text-blue-deep">
        오늘 화면으로
      </Link>
    </main>
  );
}
