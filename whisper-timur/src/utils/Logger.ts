export type LoggerLevelsType = (typeof Logger.levels)[keyof typeof Logger.levels];

export class Logger {
  static levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  private level: LoggerLevelsType;
  private prefix: string;

  constructor(level = Logger.levels.INFO, prefix = '') {
    this.level = level;
    this.prefix = prefix;
  }

  debug(...args: any[]) {
    if (this.level <= Logger.levels.DEBUG) {
      console.debug(`[${this.prefix}] [DEBUG]`, ...args);
    }
  }

  info(...args: any[]) {
    if (this.level <= Logger.levels.INFO) {
      console.info(`[${this.prefix}] [INFO]`, ...args);
    }
  }

  warn(...args: any[]) {
    if (this.level <= Logger.levels.WARN) {
      console.warn(`[${this.prefix}] [WARN]`, ...args);
    }
  }

  error(...args: any[]) {
    if (this.level <= Logger.levels.ERROR) {
      console.error(`[${this.prefix}] [ERROR]`, ...args);
    }
  }

  public setLevel(level: LoggerLevelsType) {
    this.level = level;
  }

  public getLevel() {
    return this.level;
  }
}
