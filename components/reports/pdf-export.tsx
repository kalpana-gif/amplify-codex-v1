"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";

export function PDFExport({
  targetId,
  filename,
}: {
  targetId: string;
  filename: string;
}) {
  return (
    <Button
      onClick={() => {
        const target = document.getElementById(targetId);

        if (!target) {
          return;
        }

        void html2canvas(target, {
          backgroundColor: "#F8FAFC",
          scale: 2,
        }).then((canvas) => {
          const image = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const width = 190;
          const height = (canvas.height * width) / canvas.width;

          pdf.addImage(image, "PNG", 10, 10, width, height);
          pdf.save(filename);
        });
      }}
    >
      Generate PDF
    </Button>
  );
}
