// Tiny in-browser PDF generator — produces a real downloadable PDF blob.
function buildMinimalPdf(title: string, lines: string[]): Blob {
  // Build a minimal PDF 1.4 file with text content.
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contentLines = [
    "BT",
    "/F1 22 Tf",
    "72 760 Td",
    `(${escape(title)}) Tj`,
    "0 -30 Td",
    "/F1 12 Tf",
    ...lines.flatMap((l) => [`(${escape(l)}) Tj`, "0 -18 Td"]),
    "ET",
  ].join("\n");

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");
  objects.push(`<< /Length ${contentLines.length} >>\nstream\n${contentLines}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${o.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadMockReport(title: string) {
  const blob = buildMinimalPdf("Fitved — " + title, [
    `Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
    "",
    "Resting heart rate: 68 bpm",
    "Avg session intensity: Moderate",
    "Mobility score: 7.5 / 10",
    "Coach notes: Great consistency this month. Keep focus on hip openers.",
    "",
    "This is a sample report for demo purposes.",
  ]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
