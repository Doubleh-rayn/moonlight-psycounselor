"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";
import { GUIDE_CARDS, GUIDE_CARD_HEIGHT, GUIDE_CARD_WIDTH } from "@/lib/guide/cards";
import { toneStyle } from "@/lib/design/tokens";

/**
 * 이용방법: 카드뉴스 10장을 좌우로 넘겨 본다.
 * 스크롤 스냅으로 한 장씩 멈추고, 아래 점·화살표로도 이동한다.
 */
export function GuideScreen() {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = GUIDE_CARDS.length;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(Math.max(0, Math.min(total - 1, i)));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(total - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
        <h1 className="text-[20px] font-extrabold">이용방법</h1>
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="flex size-11 items-center justify-center rounded-[14px] bg-(--face) text-(--deep) raised-3"
          style={toneStyle("surface")}
        >
          <X size={22} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label={`이용방법 카드, ${index + 1} / ${total}`}
      >
        {GUIDE_CARDS.map((card, i) => (
          <figure key={card.src} className="w-full shrink-0 snap-center px-4" aria-hidden={i !== index}>
            <Image
              src={card.src}
              alt={card.title}
              width={GUIDE_CARD_WIDTH}
              height={GUIDE_CARD_HEIGHT}
              unoptimized
              priority={i < 2}
              className="w-full rounded-card raised-card bg-surface"
            />
            <figcaption className="mt-2 text-center text-[13px] font-semibold text-muted">
              {card.title}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="이전 카드"
          className="flex size-11 items-center justify-center rounded-[14px] bg-(--face) text-(--deep) raised-3 disabled:opacity-40 disabled:pointer-events-none"
          style={toneStyle("surface")}
        >
          <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="카드 선택">
          {GUIDE_CARDS.map((card, i) => (
            <button
              key={card.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1}번 카드`}
              onClick={() => goTo(i)}
              className={clsx("size-2.5 rounded-full transition-colors", i === index ? "bg-blue-deep" : "bg-line")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === total - 1}
          aria-label="다음 카드"
          className="flex size-11 items-center justify-center rounded-[14px] bg-(--face) text-(--deep) raised-3 disabled:opacity-40 disabled:pointer-events-none"
          style={toneStyle("surface")}
        >
          <ChevronRight size={22} strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </main>
  );
}
