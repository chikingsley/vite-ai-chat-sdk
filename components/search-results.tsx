"use client";

import {
  BuildingIcon,
  CalendarIcon,
  DollarSignIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SearchFile = {
  name: string;
  fileName: string;
  url: string;
  extension?: string;
  size?: number;
};

type SearchResult = {
  id: string;
  type: string;
  name: string;
  contractor?: string;
  monday_url?: string | null;
  files?: SearchFile[];
  // Dust permit fields
  status?: string;
  permit_type?: string;
  permit_status?: string;
  invoice_status?: string;
  dust_app_number?: string;
  permit_number?: string;
  cost?: number | string;
  invoice_number?: string;
  acreage?: string;
  address?: string;
  county?: string;
  submitted_date?: string;
  expiry_date?: string;
  poc_email?: string;
  estimator?: string;
  // Estimate fields
  bid_value?: number | string;
  awarded_value?: number | string;
  bid_status?: string;
  bid_source?: string;
  estimate_id?: string;
  due_date?: string;
  bid_sent_date?: string;
  close_date?: string;
  project_start_date?: string;
  location_address?: string;
  // SWPPP fields
  status_mirror?: string;
  date_requested?: string;
  estimate_name?: string;
  // Contact fields
  email?: string;
  phone?: string;
  title?: string;
  contractor_name?: string;
  // Contractor fields
  industry?: string;
  account_type?: string;
  headquarters?: string;
  domain?: string;
  // Project fields
  project_status?: string;
  city?: string;
  state?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  general_contractor?: string;
  estimate_file?: string;
  // Inspection report fields
  project_id?: string;
  project_name?: string;
  inspection_date?: string;
  account?: string;
  super?: string;
  last_report_sent?: string;
  // Lead fields
  last_activity?: string;
  last_activity_date?: string;
  date_added?: string;
};

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatCurrency(value?: number | string): string {
  if (!value) return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date?: string): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

const TYPE_COLORS: Record<string, string> = {
  estimate: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  dust_permit:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  swppp_plan:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  contractor:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  contact: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  project: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  inspection_report:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  lead: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

const TYPE_LABELS: Record<string, string> = {
  estimate: "Estimate",
  dust_permit: "Dust Permit",
  swppp_plan: "SWPPP Plan",
  contractor: "Contractor",
  contact: "Contact",
  project: "Project",
  inspection_report: "Inspection",
  lead: "Lead",
};

function FileDownloadButton({ file }: { file: SearchFile }) {
  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      download={file.fileName}
      href={file.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <DownloadIcon className="size-3.5" />
      <span className="max-w-[120px] truncate">{file.name}</span>
      {file.extension && (
        <Badge className="px-1 py-0 text-[10px]" variant="outline">
          {file.extension.toUpperCase()}
        </Badge>
      )}
      {file.size && (
        <span className="text-muted-foreground">{formatBytes(file.size)}</span>
      )}
    </a>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const typeColor = TYPE_COLORS[result.type] || "bg-gray-100 text-gray-800";
  const typeLabel = TYPE_LABELS[result.type] || result.type;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge className={cn("shrink-0", typeColor)} variant="secondary">
              {typeLabel}
            </Badge>
            {result.status && <Badge variant="outline">{result.status}</Badge>}
          </div>
          <h4 className="line-clamp-2 font-semibold text-sm">{result.name}</h4>
        </div>
        {result.monday_url && (
          <a
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            href={result.monday_url}
            rel="noopener noreferrer"
            target="_blank"
            title="Open in Monday.com"
          >
            <ExternalLinkIcon className="size-4" />
          </a>
        )}
      </div>

      {/* Details */}
      <div className="mb-3 grid gap-1.5 text-muted-foreground text-xs">
        {result.contractor && (
          <div className="flex items-center gap-1.5">
            <BuildingIcon className="size-3.5" />
            <span>{result.contractor}</span>
          </div>
        )}
        {(result.address || result.location_address) && (
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" />
            <span className="line-clamp-1">
              {result.address || result.location_address}
            </span>
          </div>
        )}
        {(result.cost || result.bid_value || result.awarded_value) && (
          <div className="flex items-center gap-1.5">
            <DollarSignIcon className="size-3.5" />
            <span>
              {result.cost && `Cost: ${formatCurrency(result.cost)}`}
              {result.bid_value && `Bid: ${formatCurrency(result.bid_value)}`}
              {result.awarded_value &&
                ` | Awarded: ${formatCurrency(result.awarded_value)}`}
            </span>
          </div>
        )}
        {(result.due_date ||
          result.submitted_date ||
          result.expiry_date ||
          result.date_requested) && (
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" />
            <span>
              {result.due_date && `Due: ${formatDate(result.due_date)}`}
              {result.submitted_date &&
                `Submitted: ${formatDate(result.submitted_date)}`}
              {result.expiry_date &&
                ` | Expires: ${formatDate(result.expiry_date)}`}
              {result.date_requested &&
                `Requested: ${formatDate(result.date_requested)}`}
            </span>
          </div>
        )}
        {(result.estimator || result.poc_email) && (
          <div className="flex items-center gap-1.5">
            <UserIcon className="size-3.5" />
            <span>{result.estimator || result.poc_email}</span>
          </div>
        )}
        {result.permit_number && (
          <div className="flex items-center gap-1.5">
            <FileTextIcon className="size-3.5" />
            <span>Permit #: {result.permit_number}</span>
          </div>
        )}
      </div>

      {/* Files */}
      {result.files && result.files.length > 0 && (
        <div className="border-t pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-muted-foreground text-xs">
            <FileIcon className="size-3.5" />
            <span>Files ({result.files.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.files.map((file, i) => (
              <FileDownloadButton file={file} key={`${file.url}-${i}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type SearchResultsProps = {
  results: SearchResult[];
  isLoading?: boolean;
};

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            className="h-32 animate-pulse rounded-lg border bg-muted/50"
            key={i}
          />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        <FileTextIcon className="mx-auto mb-2 size-8 opacity-50" />
        <p className="text-sm">No results found</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="text-muted-foreground text-xs">
        Found {results.length} result{results.length !== 1 ? "s" : ""}
      </div>
      {results.map((result) => (
        <SearchResultCard key={result.id} result={result} />
      ))}
    </div>
  );
}
