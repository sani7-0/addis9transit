import { Injectable, Logger } from "@nestjs/common";

export interface SmsSession {
  step: string;
  data: Record<string, any>;
  expiresAt: number;
}

@Injectable()
export class SmsSessionService {
  private readonly logger = new Logger(SmsSessionService.name);
  private sessions: Map<string, SmsSession> = new Map();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes

  get(phone: string): SmsSession | null {
    const session = this.sessions.get(phone);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(phone);
      return null;
    }
    return session;
  }

  set(phone: string, step: string, data: Record<string, any> = {}) {
    this.sessions.set(phone, {
      step,
      data,
      expiresAt: Date.now() + this.TTL,
    });
    this.logger.log(`Session set for ${phone}: ${step}`);
  }

  reset(phone: string) {
    this.sessions.delete(phone);
    this.logger.log(`Session reset for ${phone}`);
  }
}
