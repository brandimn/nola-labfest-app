"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function FavoriteButton({ sessionId, initialFav }: { sessionId: string; initialFav: boolean }) {
  const [fav, setFav] = useState(initialFav);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setFav(data.favorited);
    }
  }

  return (
    <button onClick={toggle} disabled={loading} className={fav ? "btn-primary" : "btn-secondary"}>
      <Star className="h-4 w-4 mr-1" fill={fav ? "currentColor" : "none"} />
      {fav ? "In my agenda" : "Add to agenda"}
    </button>
  );
}
