import { getSessionUser } from "@/features/accounts";
import { adminRecords, csvCell, isAdminSection } from "@/features/administration";
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (user?.role !== "admin") return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  const section = params.get("section") ?? "";
  if (!isAdminSection(section) || !["users", "listings", "deals"].includes(section))
    return new Response("Invalid export", { status: 400 });
  const q = params.get("q") ?? "",
    status = params.get("status") ?? "";
  const encoder = new TextEncoder();
  let page = 1;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const data = await adminRecords(section, q, status, page, 250);
        let chunk = page === 1 ? ["ID", ...data.columns].map(csvCell).join(",") + "\r\n" : "";
        chunk +=
          data.records.map((r) => [r.id, ...r.cells].map(csvCell).join(",")).join("\r\n") +
          "\r\n";
        controller.enqueue(encoder.encode(chunk));
        if (data.records.length < 250) controller.close();
        page++;
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campus-loop-${section}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
