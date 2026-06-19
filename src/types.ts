export interface ContextWindow {
  readonly percentage?: number;
  readonly tokens?: number;
  readonly token_count?: number;
  readonly size?: number;
  readonly input?: number;
  readonly output?: number;
  readonly cache_read?: number;
  readonly cache_creation?: number;
}

export interface RateLimit {
  readonly used?: number;
  readonly limit?: number;
  readonly percentage?: number;
  readonly reset_at?: string;
  readonly remaining?: number;
}

export interface RateLimits {
  readonly session?: RateLimit;
  readonly week?: RateLimit;
  readonly day?: RateLimit;
  readonly [key: string]: RateLimit | undefined;
}

export interface Workspace {
  readonly current_dir?: string;
  readonly project_dir?: string;
}

export interface StatusJSON {
  readonly cwd?: string;
  readonly model?: string;
  readonly context_window?: ContextWindow;
  readonly rate_limits?: RateLimits;
  readonly workspace?: Workspace;
  readonly session_id?: string;
  readonly hook_event_name?: string;
  readonly version?: string;
}

export interface Segment {
  readonly label: string;
  readonly value: string;
  readonly color: AnsiColor;
}

export const ANSI_COLOR = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
} as const;

export type AnsiColor = keyof typeof ANSI_COLOR;
