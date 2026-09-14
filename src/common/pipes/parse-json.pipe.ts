/**
 * پایپ تجزیه و اعتبارسنجی فیلدهای JSON که در قالب multipart/form-data
 * به صورت رشته ارسال میشوند (مثل فیلد data در ثبتنام آرایشگر).
 *
 * چون ValidationPipe سراسری روی رشته اعمال میشود و نه روی آبجکت درون آن،
 * اعتبارسنجی DTO در اینجا به صورت دستی انجام میشود.
 */
import type { Type } from '@nestjs/common';
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';

@Injectable()
export class ParseJsonPipe<T extends object> implements PipeTransform {
  private readonly validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  constructor(
    private readonly metatype: Type<T>,
    private readonly fieldName = 'data',
  ) {}

  async transform(value: unknown): Promise<T> {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`فیلد ${this.fieldName} ارسال نشده است`);
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        `فیلد ${this.fieldName} باید به صورت رشتهٔ JSON ارسال شود`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException(
        `ساختار JSON فیلد ${this.fieldName} معتبر نیست`,
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new BadRequestException(
        `فیلد ${this.fieldName} باید یک آبجکت JSON باشد`,
      );
    }

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: this.metatype,
      data: this.fieldName,
    };

    return await this.validationPipe.transform(parsed, metadata);
  }
}
