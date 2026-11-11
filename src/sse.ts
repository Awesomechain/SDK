/** One Server-Sent Events message. */
export interface SseMessage {
  event: string;
  data: string;
  id?: string;
}

/** Reads a text/event-stream body into messages (works in browsers and Node 18+, no EventSource needed). */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let msg: { event?: string; data: string[]; id?: string } = { data: [] };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.search(/\r?\n/)) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + (buf[nl] === "\r" ? 2 : 1));
        if (line === "") {
          if (msg.data.length) yield { event: msg.event ?? "message", data: msg.data.join("\n"), id: msg.id };
          msg = { data: [] };
          continue;
        }
        if (line.startsWith(":")) continue;
        const i = line.indexOf(":");
        const field = i < 0 ? line : line.slice(0, i);
        const val = i < 0 ? "" : line.slice(i + 1).replace(/^ /, "");
        if (field === "event") msg.event = val;
        else if (field === "data") msg.data.push(val);
        else if (field === "id") msg.id = val;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
