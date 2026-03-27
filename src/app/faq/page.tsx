"use client";

import { useEffect, useState } from "react";

export default function FaqPage() {
  const [cats, setCats] = useState<{ name: string; items: { question: string; answer: string }[] }[]>(
    []
  );

  useEffect(() => {
    void fetch("/api/faq")
      .then((r) => r.json())
      .then((d) => setCats(d.categories ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">FAQ</h1>
      {cats.map((c) => (
        <section key={c.name} className="mt-8">
          <h2 className="text-lg font-semibold text-nexora-cyan">{c.name}</h2>
          <ul className="mt-3 space-y-4">
            {c.items.map((i, idx) => (
              <li key={idx} className="rounded-xl border border-white/10 bg-nexora-card p-4">
                <p className="font-medium">{i.question}</p>
                <p className="mt-2 text-sm text-nexora-muted">{i.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
