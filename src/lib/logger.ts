/**
 * Comprehensive logging utility for debugging auth and API issues
 */

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
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private isDev = import.meta.env.DEV;

  private createEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(data && { data }),
      ...(error && { error: error.message, stack: error.stack }),
    };
  }

  private log(entry: LogEntry) {
    // Add to in-memory log
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console in development
    if (this.isDev) {
      const style =
        entry.level === LogLevel.ERROR
          ? "color: red; font-weight: bold;"
          : entry.level === LogLevel.WARN
            ? "color: orange;"
            : entry.level === LogLevel.INFO
              ? "color: blue;"
              : "color: gray;";

      console.log(
        `%c[${entry.level}] ${entry.category}: ${entry.message}`,
        style
      );
      if (entry.data) console.log("Data:", entry.data);
      if (entry.error) console.log("Error:", entry.error, entry.stack);
    }
  }

  debug(category: string, message: string, data?: any) {
    this.log(this.createEntry(LogLevel.DEBUG, category, message, data));
  }

  info(category: string, message: string, data?: any) {
    this.log(this.createEntry(LogLevel.INFO, category, message, data));
  }

  warn(category: string, message: string, data?: any) {
    this.log(this.createEntry(LogLevel.WARN, category, message, data));
  }

  error(category: string, message: string, error?: Error, data?: any) {
    this.log(this.createEntry(LogLevel.ERROR, category, message, data, error));
  }

  /**
   * Log API request details
   */
  logApiCall(
    method: string,
    url: string,
    data?: { body?: any; headers?: any; timeout?: number }
  ) {
    this.debug("API", `${method} ${url}`, data);
  }

  /**
   * Log API response with status
   */
  logApiResponse(
    method: string,
    url: string,
    status: number,
    duration: number,
    data?: any
  ) {
    const logType = status >= 400 ? "warn" : "info";
    this[logType](
      "API",
      `${method} ${url} - ${status} (${duration}ms)`,
      data
    );
  }

  /**
   * Log network error
   */
  logNetworkError(
    method: string,
    url: string,
    error: Error,
    duration: number
  ) {
    this.error(
      "API",
      `${method} ${url} - Network error after ${duration}ms`,
      error
    );
  }

  /**
   * Log authentication event
   */
  logAuthEvent(
    event: "LOGIN_START" | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "SIGNUP_START" | "SIGNUP_SUCCESS" | "SIGNUP_FAILED" | "LOGOUT" | "TOKEN_VERIFIED" | "TOKEN_INVALID" | "SESSION_RESTORED",
    email?: string,
    details?: any
  ) {
    this.info("AUTH", event, { email, ...details });
  }

  /**
   * Get all logs (for debugging in console)
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
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON (useful for debugging)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Print logs to console (for debugging)
   */
  printLogs() {
    console.table(this.logs);
  }
}

// Singleton instance
export const logger = new Logger();

// Make logger available globally for debugging in console
if (typeof window !== "undefined") {
  (window as any).__logger = logger;
}
