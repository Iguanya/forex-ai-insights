import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import mysql from "npm:mysql2@3.11.0/promise";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getConnection() {
  const host = Deno.env.get("MYSQL_HOST");
  const user = Deno.env.get("MYSQL_USER");
  const password = Deno.env.get("MYSQL_PASSWORD");
  const database = Deno.env.get("MYSQL_DATABASE");
  const port = parseInt(Deno.env.get("MYSQL_PORT") || "3306");

  if (!host || !user || !password || !database) {
    throw new Error("MySQL credentials not configured. Check MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE secrets.");
  }

  const connection = await createClient({
    host,
    user,
    password,
    database,
    port,
  });

  return connection;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let connection;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expected path: /mysql-api/{resource}
    // e.g., /mysql-api/users, /mysql-api/trades, /mysql-api/query
    const resource = pathParts[pathParts.length - 1] || "";

    connection = await getConnection();

    if (req.method === "GET") {
      // GET /mysql-api?table=users&limit=100&offset=0&where=status='active'
      const table = url.searchParams.get("table");
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const orderBy = url.searchParams.get("orderBy") || "id";
      const order = url.searchParams.get("order") || "ASC";

      if (!table) {
        // Return list of tables
        const [tables] = await connection.query("SHOW TABLES");
        return new Response(JSON.stringify({ tables }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate table name (prevent SQL injection)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        return new Response(JSON.stringify({ error: "Invalid table name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validOrder = order.toUpperCase() === "DESC" ? "DESC" : "ASC";
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderBy)) {
        return new Response(JSON.stringify({ error: "Invalid orderBy column" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [rows] = await connection.query(
        `SELECT * FROM \`${table}\` ORDER BY \`${orderBy}\` ${validOrder} LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total FROM \`${table}\``
      );

      return new Response(
        JSON.stringify({ data: rows, total: (countResult as any)[0]?.total || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action, table, data, query, params } = body;

      if (action === "query" && query) {
        // Execute a parameterized read-only query
        // Only allow SELECT statements for safety
        const trimmedQuery = query.trim().toUpperCase();
        if (!trimmedQuery.startsWith("SELECT") && !trimmedQuery.startsWith("SHOW") && !trimmedQuery.startsWith("DESCRIBE")) {
          return new Response(JSON.stringify({ error: "Only SELECT, SHOW, and DESCRIBE queries are allowed via this endpoint" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const [rows] = await connection.query(query, params || []);
        return new Response(JSON.stringify({ data: rows }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "insert" && table && data) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
          return new Response(JSON.stringify({ error: "Invalid table name" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map(() => "?").join(", ");
        const columnNames = columns.map((c) => `\`${c}\``).join(", ");

        const [result] = await connection.query(
          `INSERT INTO \`${table}\` (${columnNames}) VALUES (${placeholders})`,
          values
        );

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update" && table && data && body.where) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
          return new Response(JSON.stringify({ error: "Invalid table name" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const setClauses = Object.keys(data).map((k) => `\`${k}\` = ?`).join(", ");
        const setValues = Object.values(data);

        const whereClauses = Object.keys(body.where).map((k) => `\`${k}\` = ?`).join(" AND ");
        const whereValues = Object.values(body.where);

        const [result] = await connection.query(
          `UPDATE \`${table}\` SET ${setClauses} WHERE ${whereClauses}`,
          [...setValues, ...whereValues]
        );

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete" && table && body.where) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
          return new Response(JSON.stringify({ error: "Invalid table name" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const whereClauses = Object.keys(body.where).map((k) => `\`${k}\` = ?`).join(" AND ");
        const whereValues = Object.values(body.where);

        const [result] = await connection.query(
          `DELETE FROM \`${table}\` WHERE ${whereClauses}`,
          whereValues
        );

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action. Use: query, insert, update, delete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MySQL API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore close errors
      }
    }
  }
});
