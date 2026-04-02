import { Controller, Post, Body, Logger } from "@nestjs/common";
import { SmsService } from "./sms.service";

@Controller("sms")
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(private smsService: SmsService) {}

  @Post("webhook")
  async handleWebhook(@Body() body: any) {
    const phone = body.from || body.phoneNumber;
    const text = body.text || body.message || "";

    this.logger.log(`SMS from ${phone}: "${text}"`);

    const reply = await this.smsService.handleIncoming(phone, text);

    return {
      to: phone,
      message: reply,
    };
  }
}
