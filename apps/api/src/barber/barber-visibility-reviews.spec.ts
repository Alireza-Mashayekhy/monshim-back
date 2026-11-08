import { NotFoundException } from '@nestjs/common';

import { BarberReviewService } from './barber-review.service';

describe('public reviews for a hidden barber', () => {
  it('checks the visibility flag before returning reviews', async () => {
    const query: any = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const profileRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'profile-42', userId: 42 }),
      createQueryBuilder: jest.fn().mockReturnValue(query),
    };
    const reviewRepo: any = { createQueryBuilder: jest.fn() };
    const service = new BarberReviewService(reviewRepo, profileRepo, {} as any);

    await expect(
      service.listApprovedForBarber('42', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query.andWhere).toHaveBeenCalledWith(
      'profile.isPubliclyVisible = :isPubliclyVisible',
      { isPubliclyVisible: true },
    );
    expect(reviewRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
