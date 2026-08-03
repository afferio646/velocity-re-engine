"use client";

import { useState } from "react";

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const [status1, setStatus1] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [status2, setStatus2] = useState<"idle" | "uploading" | "success" | "error">("idle");

  const [message1, setMessage1] = useState("");
  const [message2, setMessage2] = useState("");

  const handleFileChange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile1(e.target.files[0]);
    }
  }

  const handleFileChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile2(e.target.files[0]);
    }
  }

  const handleStep1 = async () => {
    if (!file1) return;

    setStatus1("uploading");
    setMessage1("Running the ATTOM Scrub... this will drop dead leads and calculate dispositions.");

    const formData = new FormData();
    formData.append("file", file1);

    try {
      const response = await fetch("/api/step1-scrub", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setStatus1("success");

        const total = response.headers.get("X-Total-Processed");
        const dropped = response.headers.get("X-Dropped-Count");
        const fails = response.headers.get("X-Api-Failures");

        setMessage1(`Success! Processed ${total} records.\nDropped (Recently Sold): ${dropped}\nATTOM Failures: ${fails}\n\nYour clean CSV is downloading now!`);

        // Trigger CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "scrubbed_leads_for_skip_matrix.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

      } else {
        const data = await response.json();
        setStatus1("error");
        setMessage1(`Error: ${data.error || "Something went wrong."}\nDetails: ${data.details || "Check Vercel Logs"}`);
      }
    } catch (err: any) {
      setStatus1("error");
      setMessage1("A network error occurred. Please try again.");
    }
  };

  const handleStep2 = async () => {
    if (!file2) return;

    setStatus2("uploading");
    setMessage2("Running DNC Waterfall and generating scripts...");

    const formData = new FormData();
    formData.append("file", file2);

    try {
      const response = await fetch("/api/step2-polish", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus2("success");
        let msg = `Success! Pushed to Google Sheets.\n\nMaximum Velocity: ${data.maximumLeads}\nHigh Velocity: ${data.highLeads}\nPrime Velocity: ${data.primeLeads}`;
        setMessage2(msg);
      } else {
        setStatus2("error");
        setMessage2(`Error: ${data.error || "Something went wrong."}\nDetails: ${data.details || "Check Vercel Logs"}`);
      }
    } catch (err: any) {
      setStatus2("error");
      setMessage2("A network error occurred. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 space-y-8">

      {/* STEP 1 */}
      <div className="bg-white p-10 rounded-xl shadow-lg max-w-lg w-full text-center border border-gray-100">
        <div className="bg-blue-100 text-blue-800 text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full inline-block mb-4">
          Step 1: The ATTOM Scrub
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Initial Data Upload</h2>
        <p className="text-gray-600 mb-8 text-sm">
          Upload your raw BatchLeads CSV here. We will filter out properties that recently sold and calculate the Dispositions. It will output a clean CSV for you to send to Skip Matrix.
        </p>

        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange1}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <button
          onClick={handleStep1}
          disabled={!file1 || status1 === "uploading"}
          className={`w-full py-3 px-4 rounded-md text-white font-bold transition-all ${
            !file1 || status1 === "uploading"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-md"
          }`}
        >
          {status1 === "uploading" ? "Scrubbing Data..." : "Run ATTOM Scrub & Download CSV"}
        </button>

        {message1 && (
          <div className={`mt-6 p-4 rounded-md whitespace-pre-wrap text-left text-sm ${
            status1 === "success" ? "bg-green-50 text-green-800 border border-green-200" :
            status1 === "error" ? "bg-red-50 text-red-800 border border-red-200" :
            "bg-blue-50 text-blue-800 border border-blue-200"
          }`}>
            {message1}
          </div>
        )}
      </div>

      {/* STEP 2 */}
      <div className="bg-white p-10 rounded-xl shadow-lg max-w-lg w-full text-center border border-gray-100">
        <div className="bg-purple-100 text-purple-800 text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full inline-block mb-4">
          Step 2: The Final Polish
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800">DNC & Google Sheets</h2>
        <p className="text-gray-600 mb-8 text-sm">
          Upload your CSV <b>after</b> running it through Skip Matrix and Telnyx. We will run the DNC Waterfall, generate Talk Tracks & Email Scripts, and push the final Golden Leads to Google Sheets.
        </p>

        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange2}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-50 file:text-purple-700
              hover:file:bg-purple-100 cursor-pointer"
          />
        </div>

        <button
          onClick={handleStep2}
          disabled={!file2 || status2 === "uploading"}
          className={`w-full py-3 px-4 rounded-md text-white font-bold transition-all ${
            !file2 || status2 === "uploading"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 shadow-md"
          }`}
        >
          {status2 === "uploading" ? "Finalizing Leads..." : "Run Final Polish"}
        </button>

        {message2 && (
          <div className={`mt-6 p-4 rounded-md whitespace-pre-wrap text-left text-sm ${
            status2 === "success" ? "bg-green-50 text-green-800 border border-green-200" :
            status2 === "error" ? "bg-red-50 text-red-800 border border-red-200" :
            "bg-purple-50 text-purple-800 border border-purple-200"
          }`}>
            {message2}
          </div>
        )}
      </div>

    </main>
  );
}
