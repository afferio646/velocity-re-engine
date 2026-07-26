"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setMessage("Processing leads. This might take a minute as we check ATTOM...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/process-leads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        let msg = `Success! Processed ${data.totalProcessed} records.\n\nHigh-Yield Liquidators: ${data.liquidatorLeads}\nEquity Anchors: ${data.anchorLeads}\nStandard Expired Pipeline: ${data.nurtureLeads}\nMissing/Invalid Addresses: ${data.missingAddresses}\nATTOM API Failures (or missing public data): ${data.apiFailures}`;

        if (data.lastApiError) {
          msg += `\n\nLatest API Error Reason:\n❌ ${data.lastApiError}`;
        }

        msg += `\n\nHeaders Found in your CSV:\n${data.headersFound?.join(", ")}`;
        setMessage(msg);
      } else {
        setStatus("error");
        setMessage(`Error: ${data.error || "Something went wrong."}\nDetails: ${data.details || "Check Vercel Logs"}`);
      }
    } catch (err: any) {
      setStatus("error");
      setMessage("A network error occurred. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-lg max-w-lg w-full text-center border border-gray-100">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">VelocityRE Data Engine</h1>
        <p className="text-gray-600 mb-8">
          Upload Jared's ArchAgent CSV file here. The system will filter the properties through ATTOM and push the golden leads directly to Google Sheets.
        </p>

        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || status === "uploading"}
          className={`w-full py-3 px-4 rounded-md text-white font-bold transition-all ${
            !file || status === "uploading"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-md"
          }`}
        >
          {status === "uploading" ? "Processing..." : "Process Leads"}
        </button>

        {message && (
          <div className={`mt-6 p-4 rounded-md whitespace-pre-wrap text-left ${
            status === "success" ? "bg-green-50 text-green-800 border border-green-200" :
            status === "error" ? "bg-red-50 text-red-800 border border-red-200" :
            "bg-blue-50 text-blue-800 border border-blue-200"
          }`}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
