import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  applySearch,
  applySort,
  getPagination,
  QueryDto,
} from 'src/common/query';
import { FilesService } from 'src/files/files.service';
import { Repository } from 'typeorm';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private readonly filesService: FilesService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    file?: Express.Multer.File,
  ) {
    let image: string = '';

    if (file) {
      const result = this.filesService.saveFile(file);
      image = result.filename;
    }

    const category = this.categoriesRepository.create({
      ...createCategoryDto,
      image,
    });

    return await this.categoriesRepository.save(category);
  }

  async findAll(query: QueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.categoriesRepository.createQueryBuilder('category');

    // search
    applySearch(qb, query.search, ['category.name', 'category.slug']);

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
    const payload = await this.categoriesRepository.findOne({
      where: { id },
    });
    return payload;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const categoryEntity = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!categoryEntity) throw new NotFoundException();

    Object.assign(categoryEntity, updateCategoryDto);

    return this.categoriesRepository.save(categoryEntity);
  }

  async remove(id: number) {
    const user = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException();

    return this.categoriesRepository.delete(id);
  }
}
