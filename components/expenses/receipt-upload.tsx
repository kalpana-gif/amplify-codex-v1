"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { uploadData } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";

const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
const maxSize = 5 * 1024 * 1024;

export function ReceiptUpload({
  expenseId,
  onUploaded,
}: {
  expenseId: string;
  onUploaded: (key: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const uploadFile = (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("Receipt files must be 5 MB or smaller.");
      return;
    }

    setUploading(true);

    void fetchAuthSession()
      .then((session) => {
        const identityId = session.identityId;

        if (!identityId) {
          throw new Error("Missing identity id for receipt upload.");
        }

        const key = `receipts/${identityId}/${expenseId}/${file.name}`;

        return uploadData({
          path: key,
          data: file,
          options: {
            contentType: file.type,
          },
        }).result.then(() => key);
      })
      .then((key) => {
        toast.success("Receipt uploaded.");
        onUploaded(key);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Upload failed.",
        );
      })
      .finally(() => setUploading(false));
  };

  return (
    <div
      className={`rounded-2xl border border-dashed p-4 transition ${
        dragging
          ? "border-[var(--color-accent)] bg-blue-50"
          : "border-slate-300"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);

        const file = event.dataTransfer.files?.[0];

        if (file) {
          uploadFile(file);
        }
      }}
    >
      <p className="text-sm text-slate-600">
        Drag and drop a JPG, PNG, or PDF receipt here, or choose a file up to 5
        MB.
      </p>
      <label className="mt-3 inline-flex cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept={allowedTypes.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            uploadFile(file);
          }}
        />
        <Button variant="secondary" size="sm">
          {uploading ? "Uploading..." : "Choose Receipt"}
        </Button>
      </label>
    </div>
  );
}
