"use client";

import { useState } from "react";

export function CopyCsv({ csv }: { csv: string }) {
  const [status, setStatus] = useState("");
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(csv).then(
          () => setStatus("Copied"),
          () => setStatus("Copy failed"),
        )
      }
    >
      {status || "Copy as CSV"}
    </button>
  );
}
