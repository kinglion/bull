import { MetadataScanner } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Job, Queue, QueueEvents } from 'bullmq';
import {
  BullModule,
  getQueueToken,
  OnQueueEvent,
  OnWorkerEvent,
  Processor,
  QueueEventsHost,
  QueueEventsListener,
  WorkerHost,
} from '../lib';

describe('BullModule', () => {
  describe('registerQueue', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.registerQueue({
              name: 'test',
              connection: {
                host: '0.0.0.0',
                port: 6380,
              },
            }),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });
      it('should inject the queue with the given name', () => {
        const queue = moduleRef.get<Queue>(getQueueToken('test'));

        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test');
      });
    });

    describe('multiple configurations', () => {
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.registerQueue(
              {
                name: 'test1',
                connection: {
                  host: '0.0.0.0',
                  port: 6380,
                },
              },
              {
                name: 'test2',
                connection: {
                  host: '0.0.0.0',
                  port: 6380,
                },
              },
            ),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });
      it('should inject the queue with name "test1"', () => {
        const queue: Queue = moduleRef.get<Queue>(getQueueToken('test1'));
        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test1');
      });
      it('should inject the queue with name "test2"', () => {
        const queue: Queue = moduleRef.get<Queue>(getQueueToken('test2'));
        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test2');
      });
    });
  });

  describe('forRoot + registerQueue', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.forRoot({
              connection: {
                host: '0.0.0.0',
                port: 6380,
              },
            }),
            BullModule.registerQueue({
              name: 'test',
            }),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });

      it('should inject the queue with the given name', () => {
        const queue: Queue = moduleRef.get<Queue>(getQueueToken('test'));
        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test');
      });
    });

    describe('multiple configurations', () => {
      beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
          imports: [
            BullModule.forRoot({
              connection: {
                host: '0.0.0.0',
                port: 6380,
              },
            }),
            BullModule.registerQueue({ name: 'test1' }, { name: 'test2' }),
          ],
        }).compile();
      });
      afterAll(async () => {
        await moduleRef.close();
      });
      it('should inject the queue with name "test1"', () => {
        const queue = moduleRef.get<Queue>(getQueueToken('test1'));

        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test1');
      });
      it('should inject the queue with name "test2"', () => {
        const queue = moduleRef.get<Queue>(getQueueToken('test2'));

        expect(queue).toBeDefined();
        expect(queue.name).toEqual('test2');
      });
    });
  });

  describe('registerQueueAsync', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.registerQueueAsync({
                name: 'test',
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with the given name', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test'));
          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test');
        });
      });
    });
    describe('multiple configurations', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.registerQueueAsync(
                {
                  name: 'test1',
                  useFactory: () => ({
                    connection: {
                      host: '0.0.0.0',
                      port: 6380,
                    },
                  }),
                },
                {
                  name: 'test2',
                  useFactory: () => ({
                    connection: {
                      host: '0.0.0.0',
                      port: 6380,
                    },
                  }),
                },
              ),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with name "test1"', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test1'));
          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test1');
        });
        it('should inject the queue with name "test2"', () => {
          const queue: Queue = moduleRef.get<Queue>(getQueueToken('test2'));
          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test2');
        });
      });
    });
  });

  describe('forRootAsync + registerQueueAsync', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      describe('useFactory', () => {
        let processorWasCalled = false;

        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({
                name: 'test',
                useFactory: () => ({
                  processors: [
                    async (_) => {
                      processorWasCalled = true;
                    },
                  ],
                }),
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with the given name', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test');
        });
        it('should trigger the processor function', async () => {
          const queueEvents = new QueueEvents('test', {
            connection: {
              host: '0.0.0.0',
              port: 6380,
            },
          });
          const queue = moduleRef.get<Queue>(getQueueToken('test'));
          const job = await queue.add('job_name', { test: true });
          await job.waitUntilFinished(queueEvents);

          expect(processorWasCalled).toBeTruthy();

          await queueEvents.close();
        });
      });
    });

    describe('multiple configurations', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({ name: 'test1' }),
              BullModule.registerQueue({ name: 'test2' }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with name "test1"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test1'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test1');
        });
        it('should inject the queue with name "test2"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test2'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test2');
        });
      });
    });
  });

  describe('forRootAsync + registerQueueAsync', () => {
    let moduleRef: TestingModule;

    describe('single configuration', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({
                name: 'test',
                useFactory: () => ({
                  processors: [],
                }),
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with the given name', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test');
        });
      });
    });

    describe('multiple shared configurations', () => {
      describe('useFactory', () => {
        beforeAll(async () => {
          moduleRef = await Test.createTestingModule({
            imports: [
              BullModule.forRootAsync({
                useFactory: () => ({
                  connection: {
                    host: '0.0.0.0',
                    port: 6380,
                  },
                }),
              }),
              BullModule.registerQueueAsync({ name: 'test1' }),
              BullModule.registerQueue({
                name: 'test2',
              }),
            ],
          }).compile();
        });
        afterAll(async () => {
          await moduleRef.close();
        });
        it('should inject the queue with name "test1"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test1'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test1');
        });
        it('should inject the queue with name "test2"', () => {
          const queue = moduleRef.get<Queue>(getQueueToken('test2'));

          expect(queue).toBeDefined();
          expect(queue.name).toEqual('test2');
        });
      });
    });
  });

  describe('full flow (job handling)', () => {
    const queueName = 'full_flow_queue';

    it('should process jobs with the given processors', (done) => {
      const processorCalledSpy = jest.fn();
      const queueCompletedEventSpy = jest.fn();
      const workerCompletedEventSpy = jest.fn();

      @QueueEventsListener(queueName)
      class EventsListener extends QueueEventsHost {
        @OnQueueEvent('completed')
        onCompleted() {
          queueCompletedEventSpy();
        }
      }

      @Processor(queueName)
      class TestProcessor extends WorkerHost {
        async process(job: Job<any, any, string>): Promise<any> {
          processorCalledSpy();
        }

        @OnWorkerEvent('completed')
        onCompleted() {
          workerCompletedEventSpy();
        }
      }

      Test.createTestingModule({
        imports: [
          BullModule.registerQueue({
            name: queueName,
            connection: {
              host: '0.0.0.0',
              port: 6380,
            },
          }),
        ],
        providers: [EventsListener, TestProcessor],
      })
        .compile()
        .then(async (testingModule) => {
          await testingModule.init();
          const queue = testingModule.get<Queue>(getQueueToken(queueName));
          const queueEvents = testingModule.get(EventsListener).queueEvents;

          const job = await queue.add('job_name', { test: true });
          await job.waitUntilFinished(queueEvents);
          await testingModule.close();

          expect(processorCalledSpy).toHaveBeenCalled();
          expect(queueCompletedEventSpy).toHaveBeenCalled();
          expect(workerCompletedEventSpy).toHaveBeenCalled();
          done();
        });
    });
  });

  describe('handles all kind of valid processors providers', () => {
    @Processor('test_processor_registering')
    class MyProcessorA extends WorkerHost {
      async process(job: Job<any, any, string>): Promise<any> {}
    }

    @Processor('test_processor_registering')
    class MyProcessorB extends WorkerHost {
      async process(job: Job<any, any, string>): Promise<any> {}
    }

    @Processor('test_processor_registering')
    class MyProcessorC extends WorkerHost {
      async process(job: Job<any, any, string>): Promise<any> {}
    }

    let testingModule: TestingModule;

    let metadataScanner: MetadataScanner;

    beforeAll(async () => {
      testingModule = await Test.createTestingModule({
        imports: [
          BullModule.registerQueue({
            name: 'test_processor_registering',
            connection: {
              host: '0.0.0.0',
              port: 6380,
            },
          }),
        ],
        providers: [
          {
            provide: 'A',
            useClass: MyProcessorA,
          },
          {
            provide: 'B',
            useValue: new MyProcessorB(),
          },
          {
            provide: 'C',
            useFactory: () => new MyProcessorC(),
          },
        ],
      }).compile();

      metadataScanner = testingModule.get(MetadataScanner);
      jest.spyOn(metadataScanner, 'scanFromPrototype');

      await testingModule.init();
    });
    afterAll(async () => {
      await testingModule.close();
    });

    it('should use MetadataScanner#scanFromPrototype when exploring', () => {
      expect(metadataScanner.scanFromPrototype).toHaveBeenCalled();
    });

    it('should reach the processor supplied with `useClass`', () => {
      const scanPrototypeCalls = jest.spyOn(
        metadataScanner,
        'scanFromPrototype',
      ).mock.calls;

      const scanPrototypeCallsFirstArgsEveryCall = scanPrototypeCalls.flatMap(
        (args) => args[0],
      );

      expect(
        scanPrototypeCallsFirstArgsEveryCall.some(
          (instanceWrapperInstance) =>
            instanceWrapperInstance.constructor.name === MyProcessorA.name,
        ),
      ).toBeTruthy();
    });

    it('should reach the processor supplied with `useValue`', () => {
      const scanPrototypeCalls = jest.spyOn(
        metadataScanner,
        'scanFromPrototype',
      ).mock.calls;

      const scanPrototypeCallsFirstArgsEveryCall = scanPrototypeCalls.flatMap(
        (args) => args[0],
      );

      expect(
        scanPrototypeCallsFirstArgsEveryCall.some(
          (instanceWrapperInstance) =>
            instanceWrapperInstance.constructor.name === MyProcessorB.name,
        ),
      ).toBeTruthy();
    });

    it('should reach the processor supplied with `useFactory`', () => {
      const scanPrototypeCalls = jest.spyOn(
        metadataScanner,
        'scanFromPrototype',
      ).mock.calls;

      const scanPrototypeCallsFirstArgsEveryCall = scanPrototypeCalls.flatMap(
        (args) => args[0],
      );

      expect(
        scanPrototypeCallsFirstArgsEveryCall.some(
          (instanceWrapperInstance) =>
            instanceWrapperInstance.constructor.name === MyProcessorC.name,
        ),
      ).toBeTruthy();
    });
  });
});
