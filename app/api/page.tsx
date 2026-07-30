/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CollapsibleJson } from "@/components/CollapsibleJson";
import {
  CollapsibleTemplate,
  getTypeTemplate,
} from "@/components/CollapsibleTemplate";
import { ApiOverview } from "@/components/ApiOverview";

type LogEntry = {
  level: "info" | "warn" | "error";
  strategy: string;
  status: string;
  elapsed: number | null;
  path: string;
  extra?: string;
  ts: number;
};

const endpoints = [
  {
    id: "home",
    title: "Home",
    method: "GET",
    path: "/api/home",
    description: "Fetch banner, popular, and newest komik for the home page.",
    params: [],
  },
  {
    id: "latest",
    title: "Latest Komik",
    method: "GET",
    path: "/api/latest?page=[page]",
    description: "Fetch the latest released komik with pagination.",
    params: [{ name: "page", placeholder: "e.g., 1" }],
  },
  {
    id: "detail",
    title: "Komik Detail",
    method: "GET",
    path: "/api/komik/[slug]",
    description: "Fetch komik details, chapter list, and recommendations.",
    params: [{ name: "slug", placeholder: "e.g., archamge-restaurant" }],
  },
  {
    id: "read",
    title: "Read Chapter",
    method: "GET",
    path: "/api/komik/[slug]/[chapterId]",
    description: "Fetch chapter images and pagination details.",
    params: [
      { name: "slug", placeholder: "e.g., archamge-restaurant" },
      { name: "chapterId", placeholder: "e.g., 132" },
    ],
  },
  {
    id: "advanceSearch",
    title: "Advance Search Komik",
    method: "GET",
    path: "/api/advanceSearch?page=[page]&take=[take]&sort=[sort]&sortOrder=[sortOrder]&status=[status]&format=[format]&genreIds=[genreIds]&search=[search]",
    description:
      "Filter and search komik. Status: ongoing, completed, hiatus, cancelled. Format: manga, manhwa, manhua, webtoon. Optional filters can be left empty.",
    params: [
      { name: "page", placeholder: "e.g., 1" },
      { name: "take", placeholder: "e.g., 12" },
      {
        name: "sort",
        placeholder: "latest | popularity | rating",
        options: ["", "latest", "popularity", "rating"],
      },
      {
        name: "sortOrder",
        placeholder: "desc | asc",
        options: ["", "desc", "asc"],
      },
      {
        name: "status",
        placeholder: "Select Status",
        options: ["ongoing", "completed", "hiatus", "cancelled"],
        multi: true,
      },
      {
        name: "format",
        placeholder: "Select Format",
        options: ["manga", "manhwa", "manhua", "mangatoon"],
        multi: true,
      },
      {
        name: "genreIds",
        placeholder: "Select Genres",
        options: [],
        multi: true,
      },
      { name: "search", placeholder: "Search title/nativeTitle" },
    ],
  },
  {
    id: "popular",
    title: "Popular Categories",
    method: "GET",
    path: "/api/popular?category=[category]&take=[take]&page=[page]",
    description: "Fetch popular komik by category.",
    params: [
      {
        name: "category",
        placeholder: "Select Category",
        options: [
          "best-manhwa",
          "best-manhua",
          "best-manga",
          "anime-adaptations",
          "trending",
        ],
      },
      { name: "take", placeholder: "e.g., 10" },
      { name: "page", placeholder: "e.g., 1" },
    ],
  },
  {
    id: "genres",
    title: "Genres List",
    method: "GET",
    path: "/api/genres",
    description: "Fetch all available genres for filtering.",
    params: [],
  },
];

export default function ApiDocs() {
  const [activeEndpointId, setActiveEndpointId] = useState("overview");
  const [paramValues, setParamValues] = useState<Record<string, string>>({
    slug: "archamge-restaurant",
    chapterId: "132",
    page: "1",
    take: "12",
    sort: "latest",
    sortOrder: "desc",
    status: "",
    format: "",
    genreIds: "",
    search: "",
    category: "best-manhwa",
  });
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genresOptions, setGenresOptions] = useState<string[]>([]);
  const [scraperLogs, setScraperLogs] = useState<LogEntry[]>([]);

  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");

  useEffect(() => {
    if (globalThis.window !== undefined) {
      setBaseUrl(globalThis.location.origin);
    }
  }, []);

  useEffect(() => {
    setScraperLogs([]);
    setResponse(null);
    setError(null);
  }, [activeEndpointId]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch("/api/genres");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setGenresOptions(json.data.map((g: any) => g.data.name));
        }
      } catch (err) {
        console.error("Failed to fetch genres", err);
      }
    };
    fetchGenres();
  }, []);

  const activeEndpoint = endpoints.find((e) => e.id === activeEndpointId);

  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectToggle = (name: string, option: string) => {
    setParamValues((prev) => {
      const currentVal = prev[name] || "";
      const selectedArr = currentVal ? currentVal.split(",") : [];
      if (selectedArr.includes(option)) {
        const newArr = selectedArr.filter((val) => val !== option);
        return { ...prev, [name]: newArr.join(",") };
      } else {
        return { ...prev, [name]: [...selectedArr, option].join(",") };
      }
    });
  };

  const getRelativeUrl = () => {
    if (!activeEndpoint) return "";
    let pathPart = activeEndpoint.path.split("?")[0];
    let queryPart = activeEndpoint.path.split("?")[1] || "";

    for (const param of activeEndpoint.params) {
      const val = paramValues[param.name];
      if (val) {
        pathPart = pathPart.replace(`[${param.name}]`, encodeURIComponent(val));

        if ((param as any).multi) {
          const encodedVal = val
            .split(",")
            .map((v) => encodeURIComponent(v).replaceAll("%20", "+"))
            .join(`&${param.name}=`);
          queryPart = queryPart.replace(`[${param.name}]`, encodedVal);
        } else {
          const encodedVal = encodeURIComponent(val).replaceAll("%20", "+");
          queryPart = queryPart.replace(`[${param.name}]`, encodedVal);
        }
      }
    }

    if (queryPart) {
      queryPart = queryPart
        .split("&")
        .filter((part) => !part.includes("["))
        .join("&");
    }

    return queryPart ? `${pathPart}?${queryPart}` : pathPart;
  };

  const getFullUrl = () => {
    return `${baseUrl}${getRelativeUrl()}`;
  };

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getFullUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleTestApi = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setScraperLogs([]);

    for (const param of activeEndpoint!.params) {
      if (
        !paramValues[param.name] &&
        ![
          "status",
          "format",
          "genreIds",
          "search",
          "sort",
          "sortOrder",
        ].includes(param.name)
      ) {
        setError(`Parameter [${param.name}] is required`);
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(getFullUrl());
      // Parse scraper logs from response header
      const logsHeader =
        res.headers.get("X-Scraper-Logs") || res.headers.get("x-scraper-logs");
      if (logsHeader) {
        try {
          const bytes = Uint8Array.from(atob(logsHeader), (c) =>
            c.charCodeAt(0),
          );
          const decoded = new TextDecoder("utf-8").decode(bytes);
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) {
            setScraperLogs(parsed);
          }
        } catch (e) {
          console.error("Error parsing X-Scraper-Logs header", e);
        }
      }
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
      {/* Custom Scrollbar Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #3f3f46 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
        .resize-y::-webkit-resizer {
          background-color: transparent;
        }
      `,
        }}
      />

      {/* Sidebar */}
      <div className="z-10 w-full md:w-72 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="p-6 border-b border-zinc-800">
          <Link
            href="/"
            className="group flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium w-fit"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:-translate-x-1 transition-transform"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
          <div className="mt-8">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">
              API Reference
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-3">
              Endpoints
            </h3>

            {/* Overview Shortcut */}
            <button
              onClick={() => {
                setActiveEndpointId("overview");
                setResponse(null);
                setError(null);
              }}
              className={`relative cursor-pointer flex flex-col items-start p-3 rounded-md text-left transition-colors ${
                activeEndpointId === "overview"
                  ? "bg-zinc-800/50"
                  : "hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2 px-1 w-full">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                    activeEndpointId === "overview"
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-zinc-500/10 text-zinc-400"
                  }`}
                >
                  INFO
                </span>
                <span
                  className={`text-sm font-medium truncate ${
                    activeEndpointId === "overview"
                      ? "text-zinc-100"
                      : "text-zinc-400"
                  }`}
                >
                  Overview
                </span>
              </div>
            </button>

            {endpoints.map((ep) => {
              const isActive = activeEndpointId === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    setActiveEndpointId(ep.id);
                    setResponse(null);
                    setError(null);
                  }}
                  className={`relative cursor-pointer flex flex-col items-start p-3 rounded-md text-left transition-colors ${
                    isActive ? "bg-zinc-800/50" : "hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 px-1 w-full">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                        ep.method === "GET"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-zinc-100" : "text-zinc-400"
                      }`}
                    >
                      {ep.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono truncate w-full px-1">
                    {ep.path}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <a
            href="https://github.com/Wakype/komikcast-api/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xs font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Report Issue
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="z-10 flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden bg-zinc-950">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10 pb-20">
            {activeEndpointId === "overview" ? (
              <ApiOverview
                endpoints={endpoints}
                onSelectEndpoint={setActiveEndpointId}
              />
            ) : activeEndpoint ? (
              <>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {activeEndpoint.method}
                      </span>
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100">
                        {activeEndpoint.title}
                      </h1>
                    </div>
                    <p className="text-zinc-400 text-base mb-6 leading-relaxed max-w-lg">
                      {activeEndpoint.description}
                    </p>

                    {/* Base URL Info Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm">
                      <span className="text-zinc-500 font-medium">
                        Base URL:
                      </span>
                      <code className="text-zinc-300 font-mono">{baseUrl}</code>
                    </div>
                  </div>

                  {/* Star on GitHub */}
                  <a
                    href="https://github.com/Wakype/komikcast-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-zinc-300 text-sm font-medium"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    Star on GitHub
                  </a>
                </div>

                {/* URL Display with Copy Button */}
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-md p-1.5 overflow-hidden">
                  <div className="flex items-center flex-1 overflow-hidden">
                    <div className="flex-1 overflow-x-auto custom-scrollbar px-3 py-2">
                      <span className="font-mono text-sm text-zinc-300 whitespace-nowrap">
                        {getRelativeUrl()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    title="Copy URL"
                    className="shrink-0 p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    {copiedUrl ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-400"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Parameters */}
                {activeEndpoint.params.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                      Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-xl bg-zinc-900/30 border border-zinc-800">
                      {activeEndpoint.params.map((param) => (
                        <div key={param.name} className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-400 flex items-center gap-1">
                            {param.name}
                            {![
                              "status",
                              "format",
                              "genreIds",
                              "search",
                              "sort",
                              "sortOrder",
                            ].includes(param.name) && (
                              <span className="text-red-400" title="Required">
                                *
                              </span>
                            )}
                          </label>
                          <div className="relative group">
                            {(param as any).multi ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {(
                                  (param.name === "genreIds"
                                    ? genresOptions
                                    : param.options) || []
                                ).map((opt: string) => {
                                  const isSelected = (
                                    paramValues[param.name] || ""
                                  )
                                    .split(",")
                                    .includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        handleMultiSelectToggle(param.name, opt)
                                      }
                                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                                        isSelected
                                          ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                                          : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                                {param.name === "genreIds" &&
                                  genresOptions.length === 0 && (
                                    <span className="text-xs text-zinc-500 py-1">
                                      Loading genres...
                                    </span>
                                  )}
                              </div>
                            ) : param.options ? (
                              <select
                                value={paramValues[param.name] || ""}
                                onChange={(e) =>
                                  handleParamChange(param.name, e.target.value)
                                }
                                className="w-full px-3 py-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 focus:border-zinc-600 focus:bg-zinc-800/50 outline-none transition-colors font-mono text-sm appearance-none"
                              >
                                {param.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt === ""
                                      ? "Any"
                                      : opt.charAt(0).toUpperCase() +
                                        opt.slice(1)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder={param.placeholder}
                                value={paramValues[param.name] || ""}
                                onChange={(e) =>
                                  handleParamChange(param.name, e.target.value)
                                }
                                className="w-full px-3 py-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-800/50 outline-none transition-colors font-mono text-sm"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scraper Log Panel — always visible */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        {isLoading ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-600" />
                        )}
                      </span>
                      <span className="text-xs font-mono font-semibold text-zinc-300">
                        Logs
                      </span>
                      {scraperLogs.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-500 font-mono">
                          {scraperLogs.length} events
                        </span>
                      )}
                    </div>
                    {scraperLogs.length > 0 && (
                      <button
                        onClick={() => setScraperLogs([])}
                        className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-medium"
                      >
                        clear
                      </button>
                    )}
                  </div>

                  {/* Log Lines */}
                  <div className="font-mono text-xs divide-y divide-zinc-900 max-h-80 overflow-y-auto overflow-x-hidden">
                    {/* Empty / loading state */}
                    {!isLoading && scraperLogs.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-zinc-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                        <span className="text-[11px]">
                          Belum ada log — tekan{" "}
                          <span className="text-zinc-500 font-semibold">
                            Send Request
                          </span>{" "}
                          untuk melihat aktivitas scraper
                        </span>
                      </div>
                    )}

                    {isLoading && scraperLogs.length === 0 && (
                      <div className="flex items-center gap-3 px-4 py-3 text-zinc-600">
                        <svg
                          className="animate-spin h-3 w-3 text-zinc-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Waiting for response...</span>
                      </div>
                    )}

                    {scraperLogs.map((log, i) => {
                      const isDone = log.strategy === "DONE";
                      const isFailed = log.strategy === "FAILED";
                      const isDedup = log.strategy === "DEDUP";
                      const isCache = log.strategy === "CACHE";
                      const isWarn = log.level === "warn";

                      const strategyBadge = (() => {
                        if (isCache)
                          return {
                            bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                            label: "CACHE",
                            dot: "bg-cyan-400",
                          };
                        if (isDone)
                          return {
                            bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold",
                            label: "DONE",
                            dot: "bg-emerald-400",
                          };
                        if (isFailed)
                          return {
                            bg: "bg-red-500/15 text-red-400 border-red-500/30 font-bold",
                            label: "FAILED",
                            dot: "bg-red-400",
                          };
                        if (isDedup)
                          return {
                            bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            label: "DEDUP",
                            dot: "bg-amber-400",
                          };
                        if (log.strategy === "ScraperAPI")
                          return {
                            bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                            label: "ScraperAPI",
                            dot: "bg-purple-400",
                          };
                        if (log.strategy === "Proxy")
                          return {
                            bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            label: "Proxy",
                            dot: "bg-blue-400",
                          };
                        if (log.strategy === "Direct")
                          return {
                            bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            label: "Direct",
                            dot: "bg-emerald-400",
                          };
                        return {
                          bg: "bg-zinc-800 text-zinc-400 border-zinc-700",
                          label: log.strategy,
                          dot: "bg-zinc-500",
                        };
                      })();

                      const statusStyle = (() => {
                        if (isFailed || isWarn)
                          return "bg-red-500/10 text-red-400 border-red-500/20";
                        if (isDone)
                          return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        if (log.status === "HIT")
                          return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-semibold";
                        if (log.status === "MISS")
                          return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        if (log.status === "STALE")
                          return "bg-orange-500/10 text-orange-400 border-orange-500/20";
                        if (log.status === "SHARED")
                          return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        if (log.status.startsWith("OK"))
                          return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        if (log.status === "START")
                          return "bg-zinc-800/80 text-zinc-400 border-zinc-700/50";
                        return "bg-zinc-800 text-zinc-400 border-zinc-700";
                      })();

                      return (
                        <div
                          key={i}
                          className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5 transition-colors ${
                            isFailed
                              ? "bg-red-500/[0.03] hover:bg-red-500/[0.06]"
                              : isDone
                                ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]"
                                : "hover:bg-zinc-900/50"
                          }`}
                        >
                          {/* Strategy badge */}
                          <div className="flex items-center gap-2 shrink-0 w-28">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono tracking-wide ${strategyBadge.bg}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${strategyBadge.dot}`}
                              />
                              {strategyBadge.label}
                            </span>
                          </div>

                          {/* Status badge */}
                          <div className="shrink-0 w-20">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border text-center ${statusStyle}`}
                            >
                              {log.status}
                            </span>
                          </div>

                          {/* Elapsed ms */}
                          <div className="shrink-0 w-16 text-right font-mono text-[11px] text-zinc-500">
                            {log.elapsed !== null ? `+${log.elapsed}ms` : ""}
                          </div>

                          {/* Path + Extra detail */}
                          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-mono text-xs text-zinc-300 break-all">
                              {log.path}
                            </span>
                            {log.extra && (
                              <span
                                className={`text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border ${
                                  isWarn || isFailed
                                    ? "border-red-500/30 text-red-400"
                                    : "border-zinc-800 text-zinc-400"
                                }`}
                              >
                                {log.extra}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col md:flex-row items-center gap-4">
                  <button
                    onClick={handleTestApi}
                    disabled={isLoading}
                    className="h-11 px-6 cursor-pointer rounded-md bg-zinc-100 text-zinc-950 font-medium hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        <span>Send Request</span>
                      </>
                    )}
                  </button>
                  {error && (
                    <div className="flex items-center gap-2 text-red-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}
                </div>

                {/* Response Section */}
                <div className="space-y-4 pt-6 border-t border-zinc-800">
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Response
                  </h3>

                  {/* Resizable Box */}
                  <div className="rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col resize-y overflow-hidden min-h-[250px] h-[500px]">
                    {/* Editor Header */}
                    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">
                          response.json
                        </span>
                      </div>

                      {response && (
                        <button
                          onClick={handleCopyResponse}
                          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                        >
                          {copiedResponse ? (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-zinc-100"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span className="text-zinc-100">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect
                                  x="9"
                                  y="9"
                                  width="13"
                                  height="13"
                                  rx="2"
                                  ry="2"
                                ></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Editor Body */}
                    <div className="relative flex-1 w-full bg-zinc-950">
                      {response ? (
                        <pre className="absolute inset-0 w-full h-full p-4 m-0 bg-transparent outline-none overflow-auto font-mono text-[13px] leading-relaxed custom-scrollbar">
                          <CollapsibleJson data={response} />
                        </pre>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-50"
                          >
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                          </svg>
                          <span className="text-sm">
                            Click &quot;Send Request&quot; to fetch data...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-right mt-2">
                    * You can drag the bottom right corner of the box to resize.
                  </p>
                </div>

                {/* Template Generator Section */}
                {response && (
                  <div className="space-y-4 pt-6 border-t border-zinc-800">
                    <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                      JSON Template
                      <Link
                        href="/template"
                        className="ml-2 text-xs font-medium px-2 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                      >
                        Open JSON to Template Tool
                      </Link>
                    </h3>

                    {/* Resizable Box */}
                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col resize-y overflow-hidden min-h-[150px] h-[300px]">
                      {/* Editor Header */}
                      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400">
                            types.ts
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const tpl = getTypeTemplate(response);
                            navigator.clipboard.writeText(tpl);
                            setCopiedTemplate(true);
                            setTimeout(() => setCopiedTemplate(false), 2000);
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                        >
                          {copiedTemplate ? (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-zinc-100"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span className="text-zinc-100">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect
                                  x="9"
                                  y="9"
                                  width="13"
                                  height="13"
                                  rx="2"
                                  ry="2"
                                ></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>

                      {/* Editor Body */}
                      <div className="relative flex-1 w-full bg-zinc-950">
                        <pre className="absolute inset-0 w-full h-full p-4 m-0 bg-transparent outline-none overflow-auto font-mono text-[13px] leading-relaxed custom-scrollbar">
                          <CollapsibleTemplate data={response} />
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
