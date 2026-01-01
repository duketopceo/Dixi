/**
 * Log Service
 * Reads and parses Winston log files, supports filtering and pagination
 */

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  stack?: string;
  [key: string]: any;
}

export interface LogFilter {
  level?: string;
  since?: number; // timestamp in ms
  search?: string;
  limit?: number;
}

export class LogService {
  private logDir: string;
  private errorLogPath: string;
  private combinedLogPath: string;

  constructor() {
    // Determine log directory
    this.logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    this.errorLogPath = path.join(this.logDir, 'error.log');
    this.combinedLogPath = path.join(this.logDir, 'combined.log');
  }

  /**
   * Read and parse log file
   */
  private readLogFile(filePath: string): LogEntry[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const entries: LogEntry[] = [];
      
      for (const line of lines) {
        try {
          // Winston logs are JSON formatted
          const parsed = JSON.parse(line);
          entries.push({
            timestamp: parsed.timestamp || new Date().toISOString(),
            level: parsed.level || 'info',
            message: parsed.message || '',
            service: parsed.service || 'dixi-backend',
            stack: parsed.stack || undefined,
            ...parsed
          });
        } catch (e) {
          // If line is not valid JSON, skip it
          continue;
        }
      }
      
      return entries;
    } catch (error) {
      logger.error('Failed to read log file:', error);
      return [];
    }
  }

  /**
   * Get backend logs with filtering
   */
  getBackendLogs(filter: LogFilter = {}): LogEntry[] {
    const { level, since, search, limit = 100 } = filter;
    
    // Read both error and combined logs
    const errorLogs = this.readLogFile(this.errorLogPath);
    const combinedLogs = this.readLogFile(this.combinedLogPath);
    
    // Combine and deduplicate (error.log entries are also in combined.log)
    const allLogs: LogEntry[] = [];
    const seen = new Set<string>();
    
    for (const log of [...errorLogs, ...combinedLogs]) {
      const key = `${log.timestamp}-${log.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        allLogs.push(log);
      }
    }
    
    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    
    // Apply filters
    let filtered = allLogs;
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    if (since) {
      filtered = filtered.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= since;
      });
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.level.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply limit
    return filtered.slice(0, limit);
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
    errorRate: number;
    oldestLog: string | null;
    newestLog: string | null;
  } {
    const errorLogs = this.readLogFile(this.errorLogPath);
    const combinedLogs = this.readLogFile(this.combinedLogPath);
    
    const allLogs: LogEntry[] = [];
    const seen = new Set<string>();
    
    for (const log of [...errorLogs, ...combinedLogs]) {
      const key = `${log.timestamp}-${log.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        allLogs.push(log);
      }
    }
    
    const byLevel: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let errorCount = 0;
    let oldestTime: number | null = null;
    let newestTime: number | null = null;
    
    for (const log of allLogs) {
      // Count by level
      const level = log.level || 'info';
      byLevel[level] = (byLevel[level] || 0) + 1;
      
      // Count by source
      const source = log.service || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
      
      // Count errors
      if (level === 'error') {
        errorCount++;
      }
      
      // Track timestamps
      const logTime = new Date(log.timestamp).getTime();
      if (oldestTime === null || logTime < oldestTime) {
        oldestTime = logTime;
      }
      if (newestTime === null || logTime > newestTime) {
        newestTime = logTime;
      }
    }
    
    const now = Date.now();
    const runtime = newestTime && oldestTime ? (now - oldestTime) / 1000 : 1; // seconds
    const errorRate = runtime > 0 ? errorCount / runtime : 0;
    
    return {
      total: allLogs.length,
      byLevel,
      bySource,
      errorRate,
      oldestLog: oldestTime ? new Date(oldestTime).toISOString() : null,
      newestLog: newestTime ? new Date(newestTime).toISOString() : null
    };
  }
}

// Singleton instance
let logServiceInstance: LogService | null = null;

export function getLogService(): LogService {
  if (!logServiceInstance) {
    logServiceInstance = new LogService();
  }
  return logServiceInstance;
}
