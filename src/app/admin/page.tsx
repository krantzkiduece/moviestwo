"use client";

import { useState } from "react";

export default function AdminPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/add-user", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setMessage(data.ok ? "✅ Added!" : "❌ Error adding user");
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/remove-user", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setMessage(data.ok ? "🗑️ Removed!" : "❌ Error removing user");
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Admin Console</h2>
      <p>Add or remove allowed first names:</p>

      <form onSubmit={handleAdd} style={{ marginBottom: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          style={{ padding: "6px", fontSize: "1em" }}
        />
        <button
          type="submit"
          style={{ marginLeft: 8, padding: "6px 16px", fontSize: "1em" }}
        >
          Add
        </button>
        <button
          onClick={handleRemove}
          style={{ marginLeft: 8, padding: "6px 16px", fontSize: "1em" }}
        >
          Remove
        </button>
      </form>

      <p>{message}</p>
    </div>
  );
}
