/*
 * Fictitious external "transport / connection" API
 */

export interface Transport {
  connect(url: string): Connection;
}

export interface Connection {
  onconnect?: (connectionId: string) => void;
  onmessage?: (data: string) => void;
  onerror?: (error: ConnectionError) => void;
  send(data: string): void;
  disconnect(): void;
}

export interface ConnectionError {
  readonly code: number;
  readonly errorMessage: string;
}
