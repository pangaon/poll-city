"use client";

type Props = {
  title: string;
  mobileSticky?: boolean;
};

export function AskAdoniButton({ title, mobileSticky = false }: Props) {
  function onClick() {
    window.dispatchEvent(
      new CustomEvent("pollcity:open-adoni", {
        detail: { prefill: `Can you walk me through: ${title}?` },
      })
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-3 ${
        mobileSticky ? "fixed bottom-4 left-4 right-4 z-30 md:static" : ""
      }`}
    >
      💬 Ask Adoni about this
    </button>
  );
}
