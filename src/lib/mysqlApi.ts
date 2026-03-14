import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mysql-api`;

async function callApi(method: string, body?: Record<string, unknown>, params?: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/** List all tables in the MySQL database */
export async function listTables() {
  return callApi("GET");
}

/** Fetch rows from a table */
export async function fetchTable(
  table: string,
  options?: { limit?: number; offset?: number; orderBy?: string; order?: "ASC" | "DESC" }
) {
  const params: Record<string, string> = { table };
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  if (options?.orderBy) params.orderBy = options.orderBy;
  if (options?.order) params.order = options.order;
  return callApi("GET", undefined, params);
}

/** Execute a read-only parameterized query */
export async function queryDatabase(query: string, params?: unknown[]) {
  return callApi("POST", { action: "query", query, params });
}

/** Insert a row into a table */
export async function insertRow(table: string, data: Record<string, unknown>) {
  return callApi("POST", { action: "insert", table, data });
}

/** Update rows in a table */
export async function updateRow(
  table: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>
) {
  return callApi("POST", { action: "update", table, data, where });
}

/** Delete rows from a table */
export async function deleteRow(table: string, where: Record<string, unknown>) {
  return callApi("POST", { action: "delete", table, where });
}
