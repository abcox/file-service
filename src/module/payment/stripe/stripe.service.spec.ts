import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { AppConfigService } from '../../config/config.service';
import { AppConfig } from '../../config/config.interface';
import { Stripe } from 'stripe';
import { PaymentIntentCreateRequestDto } from '../dto/payment-intent-create-request.dto';
import { PaymentMethodListRequestDto } from '../dto/payment-method-list-request.dto';

// Mock Stripe SDK
jest.mock('stripe', () => {
  return {
    Stripe: jest.fn().mockImplementation(() => mockStripeInstance),
  };
});

// Create mock Stripe instance with all methods
const mockStripeInstance = {
  accounts: {
    retrieve: jest.fn(),
  },
  balance: {
    retrieve: jest.fn(),
  },
  balanceTransactions: {
    list: jest.fn(),
  },
  charges: {
    list: jest.fn(),
    retrieve: jest.fn(),
  },
  customers: {
    list: jest.fn(),
    retrieve: jest.fn(),
    create: jest.fn(),
    del: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    cancel: jest.fn(),
    confirm: jest.fn(),
    capture: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    search: jest.fn(),
  },
  paymentMethods: {
    list: jest.fn(),
    retrieve: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  products: {
    list: jest.fn(),
    retrieve: jest.fn(),
    create: jest.fn(),
    del: jest.fn(),
  },
  prices: {
    list: jest.fn(),
    create: jest.fn(),
  },
};

describe('StripeService', () => {
  let service: StripeService;
  let mockConfigService: jest.Mocked<AppConfigService>;

  // Sample test data
  const mockCustomer: Partial<Stripe.Customer> = {
    id: 'cus_test123',
    email: 'test@example.com',
    name: 'Test Customer',
    object: 'customer',
  };

  const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
    id: 'pi_test123',
    amount: 1000,
    currency: 'usd',
    status: 'requires_payment_method',
    client_secret: 'pi_test123_secret_abc',
  };

  const mockPaymentMethod: Partial<Stripe.PaymentMethod> = {
    id: 'pm_test123',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2027,
    } as Stripe.PaymentMethod.Card,
  };

  const mockProduct: Partial<Stripe.Product> = {
    id: 'prod_test123',
    name: 'Test Product',
    description: 'A test product',
    active: true,
  };

  const mockPrice: Partial<Stripe.Price> = {
    id: 'price_test123',
    product: 'prod_test123',
    unit_amount: 1999,
    currency: 'usd',
  };

  const mockCharge: Partial<Stripe.Charge> = {
    id: 'ch_test123',
    amount: 1000,
    currency: 'usd',
    status: 'succeeded',
  };

  const mockBalance: Partial<Stripe.Balance> = {
    available: [
      { amount: 10000, currency: 'usd', source_types: { card: 10000 } },
    ],
    pending: [{ amount: 5000, currency: 'usd', source_types: { card: 5000 } }],
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock config service
    mockConfigService = {
      getConfig: jest.fn().mockReturnValue({
        payment: {
          stripe: {
            key: 'pk_test_123',
            secret: 'sk_test_123',
            version: '2025-12-15.clover',
          },
        },
      }),
    } as unknown as jest.Mocked<AppConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  describe('constructor', () => {
    it('should throw error when Stripe configuration is missing', async () => {
      // payment is optional in AppConfig, so omitting it is a valid typed config
      const invalidConfig: Partial<AppConfig> = {
        payment: undefined,
      };
      mockConfigService.getConfig.mockReturnValue(invalidConfig as AppConfig);

      await expect(
        Test.createTestingModule({
          providers: [
            StripeService,
            { provide: AppConfigService, useValue: mockConfigService },
          ],
        }).compile(),
      ).rejects.toThrow('Stripe configuration is missing');
    });
  });

  //#region Account & Balance Tests

  describe('getAccount', () => {
    it('should retrieve account information', async () => {
      const mockAccount: Partial<Stripe.Account> = {
        id: 'acct_test123',
        email: 'account@test.com',
      };
      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await service.getAccount();

      expect(mockStripeInstance.accounts.retrieve).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });
  });

  describe('getBalance', () => {
    it('should retrieve balance', async () => {
      mockStripeInstance.balance.retrieve.mockResolvedValue(mockBalance);

      const result = await service.getBalance();

      expect(mockStripeInstance.balance.retrieve).toHaveBeenCalled();
      expect(result).toEqual(mockBalance);
    });
  });

  describe('getBalanceTransactionList', () => {
    it('should list balance transactions with default params', async () => {
      const mockTransactions = [{ id: 'txn_1', amount: 1000 }];
      mockStripeInstance.balanceTransactions.list.mockResolvedValue({
        data: mockTransactions,
      });

      const result = await service.getBalanceTransactionList();

      expect(mockStripeInstance.balanceTransactions.list).toHaveBeenCalledWith(
        {},
      );
      expect(result).toEqual(mockTransactions);
    });

    it('should list balance transactions with custom params', async () => {
      const mockTransactions = [{ id: 'txn_1', amount: 1000 }];
      const params = { limit: 10 };
      mockStripeInstance.balanceTransactions.list.mockResolvedValue({
        data: mockTransactions,
      });

      const result = await service.getBalanceTransactionList(params);

      expect(mockStripeInstance.balanceTransactions.list).toHaveBeenCalledWith(
        params,
      );
      expect(result).toEqual(mockTransactions);
    });
  });

  //#endregion

  //#region Charge Tests

  describe('getChargeList', () => {
    it('should list charges', async () => {
      mockStripeInstance.charges.list.mockResolvedValue({
        data: [mockCharge],
      });

      const result = await service.getChargeList();

      expect(mockStripeInstance.charges.list).toHaveBeenCalledWith({});
      expect(result).toEqual([mockCharge]);
    });
  });

  describe('getCharge', () => {
    it('should retrieve a specific charge', async () => {
      mockStripeInstance.charges.retrieve.mockResolvedValue(mockCharge);

      const result = await service.getCharge('ch_test123');

      expect(mockStripeInstance.charges.retrieve).toHaveBeenCalledWith(
        'ch_test123',
      );
      expect(result).toEqual(mockCharge);
    });
  });

  //#endregion

  //#region Customer Tests

  describe('getCustomerList', () => {
    it('should list all customers', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({
        data: [mockCustomer],
      });

      const result = await service.getCustomerList();

      expect(mockStripeInstance.customers.list).toHaveBeenCalled();
      expect(result).toEqual([mockCustomer]);
    });
  });

  describe('getCustomerDetail', () => {
    it('should retrieve customer by id', async () => {
      mockStripeInstance.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await service.getCustomerDetail('cus_test123');

      expect(mockStripeInstance.customers.retrieve).toHaveBeenCalledWith(
        'cus_test123',
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should throw error when customer not found', async () => {
      mockStripeInstance.customers.retrieve.mockResolvedValue(null);

      await expect(service.getCustomerDetail('cus_invalid')).rejects.toThrow(
        'Customer not found',
      );
    });
  });

  describe('getCustomerByEmail', () => {
    it('should find customer by email', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({
        data: [mockCustomer],
      });

      const result = await service.getCustomerByEmail('test@example.com');

      expect(mockStripeInstance.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should return undefined when no customer found by email', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });

      const result = await service.getCustomerByEmail('notfound@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer', async () => {
      const createParams = { email: 'new@example.com', name: 'New Customer' };
      mockStripeInstance.customers.create.mockResolvedValue({
        ...mockCustomer,
        ...createParams,
      });

      const result = await service.createCustomer(createParams);

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith(
        createParams,
      );
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer', async () => {
      mockStripeInstance.customers.del.mockResolvedValue({ deleted: true });

      await service.deleteCustomer('cus_test123');

      expect(mockStripeInstance.customers.del).toHaveBeenCalledWith(
        'cus_test123',
      );
    });
  });

  //#endregion

  //#region Payment Intent Tests

  describe('createPaymentIntent', () => {
    it('should create payment intent for existing customer', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({
        data: [mockCustomer],
      });
      mockStripeInstance.paymentIntents.create.mockResolvedValue(
        mockPaymentIntent,
      );

      const request: PaymentIntentCreateRequestDto = {
        amount: 1000,
        currency: 'usd',
        receipt_email: 'test@example.com',
      };

      const result = await service.createPaymentIntent(request);

      expect(mockStripeInstance.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalled();
      expect(result).toBe('pi_test123');
    });

    it('should create customer if not exists before creating payment intent', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.paymentIntents.create.mockResolvedValue(
        mockPaymentIntent,
      );

      const request: PaymentIntentCreateRequestDto = {
        amount: 1000,
        currency: 'usd',
        receipt_email: 'new@example.com',
      };

      const result = await service.createPaymentIntent(request);

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(result).toBe('pi_test123');
    });

    it('should throw error if customer creation fails', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });
      mockStripeInstance.customers.create.mockResolvedValue(null);

      const request: PaymentIntentCreateRequestDto = {
        amount: 1000,
        currency: 'usd',
        receipt_email: 'fail@example.com',
      };

      await expect(service.createPaymentIntent(request)).rejects.toThrow(
        'Failed to create customer for payment intent',
      );
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve payment intent by id', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(
        mockPaymentIntent,
      );

      const result = await service.getPaymentIntent('pi_test123');

      expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith(
        'pi_test123',
      );
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel payment intent', async () => {
      const cancelledIntent = { ...mockPaymentIntent, status: 'canceled' };
      mockStripeInstance.paymentIntents.cancel.mockResolvedValue(
        cancelledIntent,
      );

      const result = await service.cancelPaymentIntent('pi_test123');

      expect(mockStripeInstance.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_test123',
      );
      expect(result.status).toBe('canceled');
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm payment intent', async () => {
      const confirmedIntent = {
        ...mockPaymentIntent,
        status: 'requires_capture',
      };
      mockStripeInstance.paymentIntents.confirm.mockResolvedValue(
        confirmedIntent,
      );

      const result = await service.confirmPaymentIntent('pi_test123');

      expect(mockStripeInstance.paymentIntents.confirm).toHaveBeenCalledWith(
        'pi_test123',
      );
      expect(result).toEqual(confirmedIntent);
    });
  });

  describe('capturePaymentIntent', () => {
    it('should capture payment intent', async () => {
      const capturedIntent = { ...mockPaymentIntent, status: 'succeeded' };
      mockStripeInstance.paymentIntents.capture.mockResolvedValue(
        capturedIntent,
      );

      const result = await service.capturePaymentIntent('pi_test123');

      expect(mockStripeInstance.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_test123',
      );
      expect(result.status).toBe('succeeded');
    });
  });

  describe('refundPaymentIntent', () => {
    it('should create refund for payment intent', async () => {
      const mockRefund = { id: 'ref_123', status: 'succeeded' };
      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.refundPaymentIntent('pi_test123');

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
      });
      expect(result).toEqual(mockRefund);
    });
  });

  describe('listPaymentIntents', () => {
    it('should list payment intents', async () => {
      mockStripeInstance.paymentIntents.list.mockResolvedValue({
        data: [mockPaymentIntent],
      });

      const result = await service.getPaymentIntentList();

      expect(mockStripeInstance.paymentIntents.list).toHaveBeenCalledWith({});
      expect(result).toEqual([mockPaymentIntent]);
    });

    it('should list payment intents with params', async () => {
      const params = { customer: 'cus_test123', limit: 10 };
      mockStripeInstance.paymentIntents.list.mockResolvedValue({
        data: [mockPaymentIntent],
      });

      const result = await service.getPaymentIntentList(params);

      expect(mockStripeInstance.paymentIntents.list).toHaveBeenCalledWith(
        params,
      );
      expect(result).toEqual([mockPaymentIntent]);
    });
  });

  describe('searchPaymentIntents', () => {
    it('should search payment intents with query', async () => {
      mockStripeInstance.paymentIntents.search.mockResolvedValue({
        data: [mockPaymentIntent],
      });

      const result = await service.searchPaymentIntents('status:"succeeded"');

      expect(mockStripeInstance.paymentIntents.search).toHaveBeenCalledWith({
        query: 'status:"succeeded"',
      });
      expect(result).toEqual([mockPaymentIntent]);
    });
  });

  describe('updatePaymentIntent', () => {
    it('should update payment intent', async () => {
      const updatedIntent = { ...mockPaymentIntent, description: 'Updated' };
      mockStripeInstance.paymentIntents.update.mockResolvedValue(updatedIntent);

      const result = await service.updatePaymentIntent('pi_test123', {
        description: 'Updated',
      });

      expect(mockStripeInstance.paymentIntents.update).toHaveBeenCalledWith(
        'pi_test123',
        { description: 'Updated' },
      );
      expect(result).toEqual(updatedIntent);
    });
  });

  //#endregion

  //#region Payment Method Tests

  describe('getPaymentMethodList', () => {
    it('should list payment methods with customer and type', async () => {
      mockStripeInstance.paymentMethods.list.mockResolvedValue({
        data: [mockPaymentMethod],
      });

      const request: PaymentMethodListRequestDto = {
        customerId: 'cus_test123',
        type: 'card',
      };

      const result = await service.getPaymentMethodList(request);

      expect(mockStripeInstance.paymentMethods.list).toHaveBeenCalledWith({
        type: 'card',
        customer: 'cus_test123',
      });
      expect(result).toEqual([mockPaymentMethod]);
    });

    it('should use default type "card" when not specified', async () => {
      mockStripeInstance.paymentMethods.list.mockResolvedValue({ data: [] });

      const request: PaymentMethodListRequestDto = {
        customerId: 'cus_test123',
      };

      await service.getPaymentMethodList(request);

      expect(mockStripeInstance.paymentMethods.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'card' }),
      );
    });

    it('should return empty array when no customer provided', async () => {
      mockStripeInstance.paymentMethods.list.mockResolvedValue({ data: [] });

      const request: PaymentMethodListRequestDto = {};

      const result = await service.getPaymentMethodList(request);

      expect(result).toEqual([]);
    });
  });

  describe('getPaymentMethod', () => {
    it('should retrieve payment method by id', async () => {
      mockStripeInstance.paymentMethods.retrieve.mockResolvedValue(
        mockPaymentMethod,
      );

      const result = await service.getPaymentMethod('pm_test123');

      expect(mockStripeInstance.paymentMethods.retrieve).toHaveBeenCalledWith(
        'pm_test123',
      );
      expect(result).toEqual(mockPaymentMethod);
    });
  });

  //#endregion

  //#region Product Tests

  describe('getProductList', () => {
    it('should list all products', async () => {
      mockStripeInstance.products.list.mockResolvedValue({
        data: [mockProduct],
      });

      const result = await service.getProductList();

      expect(mockStripeInstance.products.list).toHaveBeenCalled();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('getProductDetail', () => {
    it('should retrieve product without prices', async () => {
      mockStripeInstance.products.retrieve.mockResolvedValue(mockProduct);

      const result = await service.getProductDetail('prod_test123', false);

      expect(mockStripeInstance.products.retrieve).toHaveBeenCalledWith(
        'prod_test123',
      );
      expect(result.product).toEqual(mockProduct);
      expect(result.priceList).toBeUndefined();
    });

    it('should retrieve product with prices when includePriceList is true', async () => {
      mockStripeInstance.products.retrieve.mockResolvedValue(mockProduct);
      mockStripeInstance.prices.list.mockResolvedValue({
        data: [mockPrice],
      });

      const result = await service.getProductDetail('prod_test123', true);

      expect(mockStripeInstance.products.retrieve).toHaveBeenCalledWith(
        'prod_test123',
      );
      expect(mockStripeInstance.prices.list).toHaveBeenCalledWith({
        product: 'prod_test123',
      });
      expect(result.product).toEqual(mockProduct);
      expect(result.priceList).toEqual([mockPrice]);
    });

    it('should throw error when product not found', async () => {
      mockStripeInstance.products.retrieve.mockResolvedValue(null);

      await expect(service.getProductDetail('prod_invalid')).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      mockStripeInstance.products.del.mockResolvedValue({ deleted: true });

      await service.deleteProduct('prod_test123');

      expect(mockStripeInstance.products.del).toHaveBeenCalledWith(
        'prod_test123',
      );
    });
  });

  //#endregion

  //#region Price Tests

  describe('getPriceList', () => {
    it('should list all prices', async () => {
      mockStripeInstance.prices.list.mockResolvedValue({
        data: [mockPrice],
      });

      const result = await service.getPriceList();

      expect(mockStripeInstance.prices.list).toHaveBeenCalledWith({});
      expect(result).toEqual([mockPrice]);
    });

    it('should list prices for specific product', async () => {
      mockStripeInstance.prices.list.mockResolvedValue({
        data: [mockPrice],
      });

      const result = await service.getPriceList({ product: 'prod_test123' });

      expect(mockStripeInstance.prices.list).toHaveBeenCalledWith({
        product: 'prod_test123',
      });
      expect(result).toEqual([mockPrice]);
    });
  });

  //#endregion
});
