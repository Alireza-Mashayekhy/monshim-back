import { NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { User } from 'src/users/entities/user.entity';
import { DataSource } from 'typeorm';

import { BarberService } from './barber.service';
import { BarberProfile } from './entities/barber.entity';

/** Build real MySQL-dialect queries without requiring a running DB server. */
describe('barber visibility SQL mapping', () => {
  it('maps the entity flag to the production column in every public query', async () => {
    const source = new DataSource({
      type: 'mysql',
      database: 'test',
      entities: [join(__dirname, '../**/*.entity.ts')],
    });
    await (source as any).buildMetadatas();
    expect(
      source
        .getMetadata(BarberProfile)
        .findColumnWithPropertyName('isPubliclyVisible')?.databaseName,
    ).toBe('is_publicly_visible');

    const sql: string[] = [];
    const userRepo = source.getRepository(User);
    const profileRepo = source.getRepository(BarberProfile);
    const userBuilder = userRepo.createQueryBuilder.bind(userRepo);
    const profileBuilder = profileRepo.createQueryBuilder.bind(profileRepo);
    jest
      .spyOn(userRepo, 'createQueryBuilder')
      .mockImplementation((alias: string) => {
        const qb = userBuilder(alias);
        qb.getManyAndCount = () => {
          sql.push(qb.getQuery());
          return Promise.resolve([[], 0]);
        };
        qb.getOne = () => {
          sql.push(qb.getQuery());
          return Promise.resolve(null);
        };
        return qb;
      });
    jest
      .spyOn(profileRepo, 'createQueryBuilder')
      .mockImplementation((alias: string) => {
        const qb = profileBuilder(alias);
        qb.getRawMany = () => {
          sql.push(qb.getQuery());
          return Promise.resolve([]);
        };
        return qb;
      });

    const service = new BarberService(userRepo, profileRepo, {} as any);
    await service.findAll({});
    await expect(service.findPublicOne(42)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await service.getPublicDirectory();
    expect(sql).toHaveLength(3);
    for (const statement of sql) {
      expect(statement).toContain(
        '`profile`.`is_publicly_visible` = :isPubliclyVisible',
      );
    }
  });
});
