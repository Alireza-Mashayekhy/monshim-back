import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoriesService } from 'src/categories/categories.service';
import {
  applySearch,
  applySort,
  getPagination,
  QueryDto,
} from 'src/common/query';
import { DataSource, QueryRunner, Repository } from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Variant } from './entities/variant.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private variantRepository: Repository<Variant>,
    private dataSource: DataSource,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const { categoryIds, variants, suggestedProductIds, ...rest } =
      createProductDto;

    const product = this.productRepository.create(rest);

    // ارتباط با دسته‌بندی‌ها (با استفاده از repository)
    if (categoryIds?.length) {
      const categoriesPromises = categoryIds.map(id =>
        this.categoriesService.findOne(id),
      );
      const categories = await Promise.all(categoriesPromises);

      const validCategories = categories.filter(cat => cat !== null);
      if (validCategories.length !== categoryIds.length) {
        throw new NotFoundException('One or more category IDs invalid');
      }
      product.categories = validCategories;
    }

    // واریانت‌ها
    if (variants?.length) {
      product.variants = variants.map(v => this.variantRepository.create(v));
    }

    // محصولات پیشنهادی
    if (suggestedProductIds?.length) {
      const suggestedProducts = await this.productRepository.findBy(
        suggestedProductIds.map(id => ({ id })),
      );
      if (suggestedProducts.length !== suggestedProductIds.length) {
        throw new NotFoundException(
          'One or more suggested product IDs invalid',
        );
      }
      product.suggestedProducts = suggestedProducts;
    }

    return this.productRepository.save(product);
  }

  async findAll(query: QueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.productRepository.createQueryBuilder('user');

    // search
    applySearch(qb, query.search, ['user.fullName', 'user.phone']);

    // sort
    applySort(qb, query.sort);

    // pagination
    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page: page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const payload = await this.productRepository.findOne({
      where: { id },
    });
    return payload;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // 1. پیدا کردن محصول همراه با واریانت‌ها و محصولات پیشنهادی
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        variants: true,
        suggestedProducts: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 2. بررسی یکتایی productCode در صورت تغییر
    if (
      updateProductDto.productCode &&
      updateProductDto.productCode !== product.productCode
    ) {
      const existing = await this.productRepository.findOneBy({
        productCode: updateProductDto.productCode,
      });
      if (existing) {
        throw new ConflictException('Product code already exists');
      }
    }

    // استفاده از تراکنش برای هماهنگی بین Product و Variant‌ها
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. به‌روزرسانی فیلدهای ساده (جدا کردن فیلدهای روابط)
      const { variants, suggestedProductIds, categoryIds, ...simpleFields } =
        updateProductDto;
      Object.assign(product, simpleFields);
      await queryRunner.manager.save(product);

      // 4. به‌روزرسانی واریانت‌ها (با queryRunner)
      if (variants) {
        await this.updateVariants(product.id, variants, queryRunner);
      }

      // 5. به‌روزرسانی محصولات پیشنهادی (با queryRunner)
      if (suggestedProductIds !== undefined) {
        await this.updateSuggestedProducts(
          product,
          suggestedProductIds,
          queryRunner,
        );
      }

      // 6. به‌روزرسانی دسته‌بندی‌ها (با استفاده از سرویس CategoriesService)
      if (categoryIds !== undefined) {
        await this.updateProductCategories(product, categoryIds, queryRunner);
      }

      // 7. دریافت محصول نهایی با تمام روابط
      const updatedProduct = await queryRunner.manager.findOne(Product, {
        where: { id: product.id },
        relations: {
          variants: true,
          suggestedProducts: true,
          comments: true,
          categories: true,
        },
      });

      await queryRunner.commitTransaction();
      return updatedProduct;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // متد کمکی برای به‌روزرسانی واریانت‌ها
  private async updateVariants(
    productId: number,
    newVariantsDto: {
      color: string;
      size: string;
      price: number;
      stock?: number;
    }[],
    queryRunner: any,
  ) {
    // دریافت واریانت‌های موجود
    const existingVariants = await queryRunner.manager.find(Variant, {
      where: { product: { id: productId } },
    });

    // نگاشت برای جستجوی سریع (شناسایی با ترکیب color+size)
    const existingMap = new Map<string, Variant>();
    for (const variant of existingVariants) {
      existingMap.set(`${variant.color}|${variant.size}`, variant);
    }

    const toRemove: Variant[] = [];
    const toSave: Variant[] = [];

    for (const dto of newVariantsDto) {
      const key = `${dto.color}|${dto.size}`;
      const existing = existingMap.get(key);
      if (existing) {
        // به‌روزرسانی واریانت موجود (فقط قیمت و موجودی)
        existing.price = dto.price;
        existing.stock = dto.stock ?? 0;
        toSave.push(existing);
        existingMap.delete(key);
      } else {
        // ایجاد واریانت جدید
        const newVariant = queryRunner.manager.create(Variant, {
          ...dto,
          product: { id: productId },
        });
        toSave.push(newVariant);
      }
    }

    // واریانت‌هایی که باقی مانده‌اند باید حذف شوند
    for (const remaining of existingMap.values()) {
      toRemove.push(remaining);
    }

    if (toRemove.length) await queryRunner.manager.remove(toRemove);
    if (toSave.length) await queryRunner.manager.save(toSave);
  }

  private async updateProductCategories(
    product: Product,
    categoryIds: number[],
    queryRunner: QueryRunner,
  ) {
    if (!categoryIds.length) {
      product.categories = [];
    } else {
      // استفاده از سرویس CategoriesService (بدون queryRunner)
      // توجه: این سرویس از ریپازیتوری معمولی استفاده می‌کند، نه queryRunner فعلی.
      // اما چون فقط read است، در تراکنش اختلالی ایجاد نمی‌کند.
      const categories =
        await this.categoriesService.findManyByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('One or more category IDs invalid');
      }
      product.categories = categories;
    }
    await queryRunner.manager.save(product);
  }

  // متد کمکی برای به‌روزرسانی محصولات پیشنهادی
  private async updateSuggestedProducts(
    product: Product,
    suggestedProductIds: number[],
    queryRunner: any,
  ) {
    if (!suggestedProductIds.length) {
      product.suggestedProducts = [];
    } else {
      const suggestedProducts = await queryRunner.manager.findByIds(
        Product,
        suggestedProductIds,
      );
      if (suggestedProducts.length !== suggestedProductIds.length) {
        throw new NotFoundException('Some suggested product IDs are invalid');
      }
      product.suggestedProducts = suggestedProducts;
    }
    await queryRunner.manager.save(product);
  }

  async remove(id: number) {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) throw new NotFoundException();

    return this.productRepository.delete(id);
  }
}
