/**
 * گارد اسکیمای پایگاه داده.
 *
 * در محیط توسعه `synchronize` روشن است و TypeORM جدول‌ها را خودش می‌سازد، اما در
 * production این گزینه خاموش است و جدول‌های تازه باید با فایل‌های `sql/` ساخته
 * شوند. اگر آن فایل‌ها اجرا نشوند، اولین درخواست به آن جدول با خطای
 * «table doesn't exist» به یک HTTP 500 بی‌معنا برای کاربر تبدیل می‌شود
 * (نمونهٔ واقعی: ساخت کد تخفیف در پنل ادمین).
 *
 * این کمک‌تابع اجازه می‌دهد یک entity به‌صورت **idempotent** و فقط در صورت نبودِ
 * جدول/ستون، از روی همان متادیتای entity ساخته شود؛ یعنی اسکیمای ساخته‌شده همیشه
 * با تعریف entity هم‌تراز است و نیازی به نگهداری DDL دستی ندارد.
 */
import {
  DataSource,
  EntityTarget,
  ObjectLiteral,
  QueryRunner,
  Table,
} from 'typeorm';

export interface TableSchemaReport {
  /** نام جدولی که بررسی/ساخته شد */
  table: string;
  /** آیا جدول از نو ساخته شد؟ */
  created: boolean;
  /** ستون‌هایی که به جدول موجود اضافه شدند */
  addedColumns: string[];
  /** خطاهایی که مانع اجرای کامل گارد شدند (بدون شکست‌دادن فرایند) */
  warnings: string[];
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * جدول را (در صورت نبود) می‌سازد و ستون‌های جاماندهٔ یک جدول موجود را اضافه
 * می‌کند. هیچ‌گاه برای ستون‌های موجود تغییری ایجاد نمی‌کند و اگر افزودن ستونی
 * ممکن نبود (مثلاً ستون NOT NULL بدون مقدار پیش‌فرض روی جدول پُر) آن را به‌صورت
 * warning گزارش می‌دهد تا بوت سرویس شکست نخورد.
 */
export async function ensureTableSchema(
  queryRunner: QueryRunner,
  table: Table,
): Promise<TableSchemaReport> {
  const warnings: string[] = [];
  const existing = await queryRunner.getTable(table.name);

  if (!existing) {
    // `ifNotExists = true` تا بالا آمدن هم‌زمان چند نمونه (instance) از سرویس
    // خطای «table already exists» تولید نکند.
    await queryRunner.createTable(table, true);
    return {
      table: table.name,
      created: true,
      addedColumns: [],
      warnings,
    };
  }

  const existingColumns = new Set(existing.columns.map(column => column.name));
  const missingColumns = table.columns.filter(
    column => !existingColumns.has(column.name),
  );
  const addedColumns: string[] = [];

  for (const column of missingColumns) {
    try {
      await queryRunner.addColumn(table.name, column);
      addedColumns.push(column.name);
    } catch (error) {
      warnings.push(
        `افزودن ستون «${column.name}» به جدول «${table.name}» ناموفق بود: ${describeError(error)}`,
      );
    }
  }

  return { table: table.name, created: false, addedColumns, warnings };
}

/**
 * نسخهٔ سطح‌بالا: جدولِ متناظر با یک entity را از روی متادیتای TypeORM می‌سازد.
 * اگر جدول کامل باشد، فقط یک پرس‌وجوی سبک روی اسکیمای پایگاه داده انجام می‌شود.
 */
export async function ensureEntitySchema(
  dataSource: DataSource,
  entity: EntityTarget<ObjectLiteral>,
): Promise<TableSchemaReport> {
  const metadata = dataSource.getMetadata(entity);
  const table = Table.create(metadata, dataSource.driver);
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    return await ensureTableSchema(queryRunner, table);
  } finally {
    await queryRunner.release();
  }
}
