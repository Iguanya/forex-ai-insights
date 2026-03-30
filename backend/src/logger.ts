/**
 * Backend logging utility for Node.js/Express server
 * Provides structured logging for auth, API calls, and errors
 */

import fs from "fs";
import path from "path";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: string;
  stack?: string;
  requestId?: string;
}

class BackendLogger {
  private logs: LogEntry[] = [];
  private maxMemoryLogs = 500;
  private logFilePath: string;
  private logToFile: boolean;
  private logToConsole: boolean;

  constructor(
    logFilePath?: string,
    logToFile: boolean = true,
    logToConsole: boolean = true
  ) {
    this.logToFile = logToFile;
    this.logToConsole = logToConsole;
    this.logFilePath = logFilePath || path.join(process.cwd(), "logs", "app.log");

    // Create logs directory if it doesn't exist
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private createEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    error?: Error,
    requestId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(data && { data }),
      ...(error && { error: error.message, stack: error.stack }),
      ...(requestId && { requestId }),
    };
  }

  private write(entry: LogEntry) {
    // Add to in-memory log
    this.logs.push(entry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }

    // Output to console
    if (this.logToConsole) {
      const timestamp = entry.timestamp;
      const level = entry.level;
      const category = entry.category;
      const message = entry.message;
      const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";
      const errorStr = entry.error ? ` | Error: ${entry.error}` : "";

      const logLine = `[${timestamp}] ${level} [${category}] ${message}${dataStr}${errorStr}`;

      if (level === LogLevel.ERROR) {
        console.error(logLine);
        if (entry.stack) console.error(entry.stack);
      } else if (level === LogLevel.WARN) {
        console.warn(logLine);
      } else {
        console.log(logLine);
      }
    }

    // Output to file
    if (this.logToFile) {
      try {
        const logLine = JSON.stringify(entry) + "\n";
        fs.appendFileSync(this.logFilePath, logLine);
      } catch (err) {
        console.error("Failed to write to log file:", err);
      }
    }
  }

  debug(
    category: string,
    message: string,
    data?: any,
    requestId?: string
  ) {
    this.write(
      this.createEntry(LogLevel.DEBUG, category, message, data, undefined, requestId)
    );
  }

  info(category: string, message: string, data?: any, requestId?: string) {
    this.write(
      this.createEntry(LogLevel.INFO, category, message, data, undefined, requestId)
    );
  }

  warn(category: string, message: string, data?: any, requestId?: string) {
    this.write(
      this.createEntry(LogLevel.WARN, category, message, data, undefined, requestId)
    );
  }

  error(
    category: string,
    message: string,
    error?: Error,
    data?: any,
    requestId?: string
  ) {
    this.write(
      this.createEntry(LogLevel.ERROR, category, message, data, error, requestId)
    );
  }

  /**
   * Log HTTP request incoming
   */
  logRequest(
    method: string,
    path: string,
    ip: string,
    requestId?: string
  ) {
    this.info("HTTP_REQUEST", `${method} ${path}`, { ip }, requestId);
  }

  /**
   * Log HTTP response
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestId?: string
  ) {
    const statusCategory =
      statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";
    this.info(
      "HTTP_RESPONSE",
      `${method} ${path} - ${statusCode} (${duration}ms)`,
      { statusCode, duration },
      requestId
    );
  }

  /**
   * Log authentication event
   */
  logAuthEvent(
    event:
      | "LOGIN_ATTEMPT"
      | "LOGIN_SUCCESS"
      | "LOGIN_FAILED"
      | "SIGNUP_ATTEMPT"
      | "SIGNUP_SUCCESS"
      | "SIGNUP_FAILED"
      | "TOKEN_VERIFIED"
      | "TOKEN_INVALID",
    email?: string,
    details?: any,
    requestId?: string
  ) {
    this.info("AUTH", event, { email, ...details }, requestId);
  }

  /**
   * Log database query
   */
  logDatabase(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    requestId?: string
  ) {
    this.debug(
      "DATABASE",
      `${operation} on ${table} (${duration}ms)`,
      { success },
      requestId
    );
  }

  /**
   * Get all logs (for debugging)
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((l) => l.level === level);
  }

  /**
   * Get logs filtered by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(
      (l) => l.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Get logs from the last N minutes
   */
  getRecentLogs(minutes: number = 10): LogEntry[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter((l) => new Date(l.timestamp) > cutoffTime);
  }

  /**
   * Clear in-memory logs (file logs are persisted)
   */
  clearMemoryLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}

// Singleton instance
export const backendLogger = new BackendLogger();

export default backendLogger;
