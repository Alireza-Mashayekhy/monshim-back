import { BookingSmsService } from './booking-sms.service';

const params = {
  customerName: 'مشتری',
  serviceName: 'خدمت',
  date: '2099-01-01',
  time: '12:00',
  salonName: 'سالن',
};

describe('booking reminder SMS', () => {
  it('propagates provider errors and unconfigured service so the scheduler can retry', async () => {
    const provider = {
      sendTemplate: jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ messageId: 1, cost: 0 }),
    };
    const service = new BookingSmsService(provider as never);
    await expect(
      service.sendReminderToCustomer('09121234567', params),
    ).rejects.toThrow('offline');
    await expect(
      service.sendReminderToCustomer('09121234567', params),
    ).rejects.toThrow();
    await expect(
      service.sendReminderToCustomer('09121234567', params),
    ).resolves.toBeUndefined();
  });
});
