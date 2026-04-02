import { paymentsService } from '../payments.service'
import api from '@/lib/api'

jest.mock('@/lib/api')

const mockedApi = api as jest.Mocked<typeof api>

describe('PaymentsService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('creates a payment successfully', async () => {
      const mockPayment = {
        id: '1',
        reference: 'PAY-123',
        amount: 10000,
        currency: 'XAF',
        status: 'pending',
        payment_url: 'https://example.com/pay/PAY-123',
      }

      mockedApi.post.mockResolvedValueOnce({ data: mockPayment })

      const paymentData = {
        amount: 10000,
        currency: 'XAF',
        description: 'Test payment',
      }

      const result = await paymentsService.create(paymentData)

      expect(mockedApi.post).toHaveBeenCalledWith('/payments', paymentData)
      expect(result).toEqual(mockPayment)
    })

    it('throws error when payment creation fails', async () => {
      const error = new Error('Payment creation failed')
      mockedApi.post.mockRejectedValueOnce(error)

      await expect(
        paymentsService.create({ amount: 10000, currency: 'XAF' })
      ).rejects.toThrow('Payment creation failed')
    })
  })

  describe('list', () => {
    it('lists payments without filters', async () => {
      const mockResponse = {
        data: [
          { id: '1', reference: 'PAY-123' },
          { id: '2', reference: 'PAY-456' },
        ],
        total: 2,
        page: 1,
        per_page: 20,
      }

      mockedApi.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await paymentsService.list()

      expect(mockedApi.get).toHaveBeenCalledWith('/payments?')
      expect(result).toEqual(mockResponse)
    })

    it('lists payments with pagination', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 2,
        per_page: 10,
      }

      mockedApi.get.mockResolvedValueOnce({ data: mockResponse })

      await paymentsService.list({ page: 2, per_page: 10 })

      expect(mockedApi.get).toHaveBeenCalledWith('/payments?page=2&per_page=10')
    })

    it('lists payments with status filter', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      }

      mockedApi.get.mockResolvedValueOnce({ data: mockResponse })

      await paymentsService.list({ status: 'completed' })

      expect(mockedApi.get).toHaveBeenCalledWith('/payments?status=completed')
    })

    it('lists payments with multiple filters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      }

      mockedApi.get.mockResolvedValueOnce({ data: mockResponse })

      await paymentsService.list({
        page: 1,
        per_page: 50,
        status: 'pending',
        search: 'test',
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      })

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/payments?page=1&per_page=50&status=pending&search=test&date_from=2024-01-01&date_to=2024-12-31'
      )
    })
  })

  describe('get', () => {
    it('gets a payment by id', async () => {
      const mockPayment = {
        id: '1',
        reference: 'PAY-123',
        amount: 10000,
        status: 'completed',
      }

      mockedApi.get.mockResolvedValueOnce({ data: mockPayment })

      const result = await paymentsService.get('PAY-123')

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/PAY-123')
      expect(result).toEqual(mockPayment)
    })

    it('throws error when payment not found', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Payment not found'))

      await expect(paymentsService.get('INVALID')).rejects.toThrow(
        'Payment not found'
      )
    })
  })

  describe('cancel', () => {
    it('cancels a payment successfully', async () => {
      const mockPayment = {
        id: '1',
        reference: 'PAY-123',
        status: 'cancelled',
      }

      mockedApi.post.mockResolvedValueOnce({ data: mockPayment })

      const result = await paymentsService.cancel('PAY-123')

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/PAY-123/cancel')
      expect(result).toEqual(mockPayment)
      expect(result.status).toBe('cancelled')
    })

    it('throws error when cancel fails', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Cannot cancel payment'))

      await expect(paymentsService.cancel('PAY-123')).rejects.toThrow(
        'Cannot cancel payment'
      )
    })
  })
})
