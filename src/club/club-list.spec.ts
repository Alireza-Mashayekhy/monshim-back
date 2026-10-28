import { ClubService } from './club.service';

describe('ClubService — لیست مشتریان و گروه‌ها', () => {
  function buildListHarness() {
    const queryBuilders: any[] = [];

    const makeQb = () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn(() => qb),
        where: jest.fn(() => qb),
        andWhere: jest.fn(() => qb),
        skip: jest.fn(() => qb),
        take: jest.fn(() => qb),
        orderBy: jest.fn(() => qb),
        select: jest.fn(() => qb),
        addSelect: jest.fn(() => qb),
        groupBy: jest.fn(() => qb),
        getManyAndCount: jest.fn(() =>
          Promise.resolve([[{ id: 'member-1', fullName: 'علی' }], 1]),
        ),
        getRawMany: jest.fn(() =>
          Promise.resolve([{ groupId: 'group-1', count: '3' }]),
        ),
      };
      queryBuilders.push(qb);
      return qb;
    };

    const clubCustomerRepo: any = {
      createQueryBuilder: jest.fn(() => makeQb()),
    };

    const groupRepo: any = {
      find: jest.fn().mockResolvedValue([
        { id: 'group-1', name: 'وفادار', isDefault: true },
        { id: 'group-2', name: 'جدید', isDefault: false },
      ]),
      save: jest.fn(),
      create: jest.fn(),
    };

    const barberProfileRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'barber-1', userId: 7 }),
    };

    const service = new ClubService(
      clubCustomerRepo,
      groupRepo,
      barberProfileRepo,
      { findOne: jest.fn() } as any,
    );

    return { service, queryBuilders, clubCustomerRepo, groupRepo };
  }

  it('لیست مشتریان، موجودیت حساس User را join نمی‌کند (هش رمز و کد ملی لو نمی‌رود)', async () => {
    const { service, queryBuilders } = buildListHarness();

    await service.listCustomers(7, { page: 1, limit: 10 });

    const [listQb] = queryBuilders;
    const joinedRelations = listQb.leftJoinAndSelect.mock.calls.map(
      (call: any[]) => call[0],
    );

    expect(joinedRelations).toContain('club.group');
    expect(joinedRelations).not.toContain('club.customer');
  });

  it('لیست گروه‌ها تعداد اعضای هر گروه را برمی‌گرداند', async () => {
    const { service } = buildListHarness();

    const groups = await service.listGroups(7);

    expect(groups).toEqual([
      expect.objectContaining({ id: 'group-1', customersCount: 3 }),
      expect.objectContaining({ id: 'group-2', customersCount: 0 }),
    ]);
  });
});
