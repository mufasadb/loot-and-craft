// Safe logging utility that handles environments where console may not be available

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isConsoleAvailable(): boolean {
    try {
      return typeof console !== 'undefined' && console.log !== undefined;
    } catch {
      return false;
    }
  }

  private safeLog(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.isConsoleAvailable()) {
      // In environments without console, we could:
      // - Store logs in memory for later retrieval
      // - Send to a logging service
      // - Display in UI
      // For now, just silently ignore
      return;
    }

    try {
      switch (level) {
        case 'debug':
          console.debug(message, ...args);
          break;
        case 'info':
          console.log(message, ...args);
          break;
        case 'warn':
          console.warn(message, ...args);
          break;
        case 'error':
          console.error(message, ...args);
          break;
      }
    } catch {
      // Even if console exists, some methods might not be available
      // Fall back to basic logging if available
      try {
        if (console.log) {
          console.log(`[${level.toUpperCase()}]`, message, ...args);
        }
      } catch {
        // Complete failure - ignore silently
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    this.safeLog('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.safeLog('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.safeLog('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.safeLog('error', message, ...args);
  }

  // Convenience method for logging errors with context
  errorWithContext(message: string, error: Error, context?: Record<string, any>): void {
    if (context) {
      this.error(message, error, context);
    } else {
      this.error(message, error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for backwards compatibility and convenience
export default logger;