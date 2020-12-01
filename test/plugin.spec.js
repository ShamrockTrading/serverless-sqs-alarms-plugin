'use strict';

const Plugin = require('../');

describe('Plugin', () => {
  it('should successfully create create the JSON CloudFormation template', () => {
    const config = {
      getProvider: () => ({ getRegion: () => 'test-region' }),
      service: {
        custom: {
          'sqs-alarms': [
            { queue: 'test-queue',
              topic: 'test-topic',
              metricName: 'SomeAWSMetricHere',
              thresholds: [
                {value: 1, evaluationPeriods: 2, description: 'Value of 1 within 2 minutes'},
                {value: 5, evaluationPeriods: 6},
                {value: 20, evaluationPeriods: 23, description: 'Some random description'},
              ]
            }
          ]
        },
        provider: {
          compiledCloudFormationTemplate: {
            Resources: {}
          }
        }
      }
    };

    const test = new Plugin(config);
    test.beforeDeployResources();

    const data = config.service.provider.compiledCloudFormationTemplate.Resources;

    expect(data).toHaveProperty('testqueueMessageAlarm1');
    expect(data).toHaveProperty('testqueueMessageAlarm5');
    expect(data).toHaveProperty('testqueueMessageAlarm20');

    expect(data).toHaveProperty('testqueueMessageAlarm1');
    expect(data).toHaveProperty(
      'testqueueMessageAlarm1.Properties.AlarmDescription', 'Value of 1 within 2 minutes'
    );
    expect(data).toHaveProperty('testqueueMessageAlarm1.Properties.Threshold', 1);
    expect(data).toHaveProperty('testqueueMessageAlarm1.Properties.EvaluationPeriods', 2);

    expect(data).toHaveProperty('testqueueMessageAlarm5.Type', 'AWS::CloudWatch::Alarm');
    expect(data).toHaveProperty(
      'testqueueMessageAlarm5.Properties.AlarmDescription',
      'Alarm if SomeAWSMetricHere is GreaterThanOrEqualToThreshold 5 within 6 minutes'
    );
    expect(data).toHaveProperty('testqueueMessageAlarm5.Properties.Threshold', 5);

    expect(data).toHaveProperty('testqueueMessageAlarm20.Type', 'AWS::CloudWatch::Alarm');
    expect(data).toHaveProperty(
      'testqueueMessageAlarm20.Properties.AlarmDescription',
      'Some random description'
    );
    expect(data).toHaveProperty('testqueueMessageAlarm20.Properties.Threshold', 20);
    expect(data).toHaveProperty('testqueueMessageAlarm20.Properties.EvaluationPeriods', 23);
  });
});

describe('alarm name', () => {
  let config

  beforeEach(() => {
    config = {
      getProvider: () => ({ getRegion: () => 'test-region' }),
      service: {
        custom: {
          'sqs-alarms': [
            { queue: 'test-queue',
              topic: 'test-topic',
              thresholds: [1, 2, 3]
            }
          ]
        },
        provider: {
          compiledCloudFormationTemplate: {
            Resources: {}
          }
        }
      }
    };
  });

  describe('is given', () => {
    it('adds alarm name to CloudFormation configuration', () => {
      config.service.custom['sqs-alarms'][0].name = 'alarm';

      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.AlarmName', 'alarm-test-queue-3');
    });
  });

  describe('is not given', () => {
    it('adds no alarm name to CloudFormation configuration', () => {
      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).not.toHaveProperty('testqueueMessageAlarm3.Properties.AlarmName');
    });
  });
});

it('creates alarms for multiple queues', () => {
  const config = {
    getProvider: () => ({ getRegion: () => 'test-region' }),
    service: {
      custom: {
        'sqs-alarms': [
          {
            queue: 'test-queue',
            topic: 'test-topic',
            thresholds: [1, 2]
          },
          {
            queue: 'test-queue-2',
            topic: 'test-topic',
            thresholds: [1, 2]
          }
        ]
      },
      provider: {
        compiledCloudFormationTemplate: {
          Resources: {}
        }
      }
    }
  };

  const test = new Plugin(config);
  test.beforeDeployResources();

  const data = config.service.provider.compiledCloudFormationTemplate.Resources;

  expect(data).toHaveProperty('testqueueMessageAlarm1');
  expect(data).toHaveProperty('testqueueMessageAlarm2');
  expect(data).toHaveProperty('testqueue2MessageAlarm1');
  expect(data).toHaveProperty('testqueue2MessageAlarm2');
})

it('does not fail without configuration', () => {
  const config = {
    getProvider: () => ({ getRegion: () => 'test-region' }),
    service: {
      custom: { },
      provider: {
        compiledCloudFormationTemplate: {
          Resources: {}
        }
      }
    }
  };

  const test = new Plugin(config);
  test.beforeDeployResources();

  const data = config.service.provider.compiledCloudFormationTemplate.Resources;

  expect(data).not.toHaveProperty('testqueueMessageAlarm3');
});

describe('alarm treatMissingData', () => {
  let config;

  beforeEach(() => {
    config = {
      getProvider: () => ({ getRegion: () => 'test-region' }),
      service: {
        custom: {
          'sqs-alarms': [
            { queue: 'test-queue',
              topic: 'test-topic',
              thresholds: [1, 2, 3]
            }
          ]
        },
        provider: {
          compiledCloudFormationTemplate: {
            Resources: {}
          }
        }
      }
    }
  });

  describe('is not provided', () => {
    it('adds alarm without treatMissingData property', () => {
      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;
      expect(data).not.toHaveProperty('testqueueMessageAlarm3.Properties.TreatMissingData');
    });
  });

  describe('is provided as a string of of a valid type', () => {
    it('adds alarms with treatMissingData property set to value for all alarms', () => {
      config.service.custom['sqs-alarms'][0].treatMissingData = 'notBreaching';

      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).toHaveProperty('testqueueMessageAlarm1.Properties.TreatMissingData', 'notBreaching');
      expect(data).toHaveProperty('testqueueMessageAlarm2.Properties.TreatMissingData', 'notBreaching');
      expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.TreatMissingData', 'notBreaching');
    });
  });

  describe('is provided as a string an invalid type', () => {
    it('adds alarms with treatMissingData property set to value for all alarms', () => {
      config.service.custom['sqs-alarms'][0].treatMissingData = 'invalid';

      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).not.toHaveProperty('testqueueMessageAlarm1.Properties.TreatMissingData');
      expect(data).not.toHaveProperty('testqueueMessageAlarm2.Properties.TreatMissingData');
      expect(data).not.toHaveProperty('testqueueMessageAlarm3.Properties.TreatMissingData');
    });
  });

  describe('is provided as an array of strings of valid types', () => {
    it('adds alarms with treatMissingData property set to corresponding value', () => {
      config.service.custom['sqs-alarms'][0].treatMissingData = ['notBreaching', 'breaching', 'ignore'];

      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).toHaveProperty('testqueueMessageAlarm1.Properties.TreatMissingData', 'notBreaching');
      expect(data).toHaveProperty('testqueueMessageAlarm2.Properties.TreatMissingData', 'breaching');
      expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.TreatMissingData', 'ignore');
    });

    it('adds alarms with treatMissingData to only the alarms with matching index', () => {
      config.service.custom['sqs-alarms'][0].treatMissingData = ['notBreaching', 'breaching'];

      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).toHaveProperty('testqueueMessageAlarm1.Properties.TreatMissingData', 'notBreaching');
      expect(data).toHaveProperty('testqueueMessageAlarm2.Properties.TreatMissingData', 'breaching');
      expect(data).not.toHaveProperty('testqueueMessageAlarm3.Properties.TreatMissingData');
    });

    it('adds alarms with treatMissingData ignoring ivalid types', () => {
      config.service.custom['sqs-alarms'][0].treatMissingData = ['notBreaching', 'invalid', 'missing'];

      const test = new Plugin(config);
      test.beforeDeployResources();

      const data = config.service.provider.compiledCloudFormationTemplate.Resources;

      expect(data).toHaveProperty('testqueueMessageAlarm1.Properties.TreatMissingData', 'notBreaching');
      expect(data).not.toHaveProperty('testqueueMessageAlarm2.Properties.TreatMissingData');
      expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.TreatMissingData', 'missing');
    });
  });
});

it('creates CloudFormation configuration with custom thresholds', () => {
  const config = {
    getProvider: () => ({ getRegion: () => 'test-region' }),
    service: {
      custom: {
        'sqs-alarms': [
          {
            queue: 'test-queue',
            topic: 'test-topic',
            thresholds: [
              {
                value: 1,
                period: 5,
                evaluationPeriods: 1
              },
              {
                value: 2,
                period: 5,
                evaluationPeriods: 1
              },
              {
                value: 3,
                period: 5,
                evaluationPeriods: 1,
                namespace: 'test'
              }
            ]
          }
        ]
      },
      provider: {
        compiledCloudFormationTemplate: {
          Resources: {}
        }
      }
    }
  };

  const test = new Plugin(config);
  test.beforeDeployResources();

  const data = config.service.provider.compiledCloudFormationTemplate.Resources

  expect(data).toHaveProperty('testqueueMessageAlarm3');
  expect(data).toHaveProperty('testqueueMessageAlarm3.Type', 'AWS::CloudWatch::Alarm');
  expect(data).toHaveProperty('testqueueMessageAlarm3.Properties');
  expect(data).toHaveProperty(
    'testqueueMessageAlarm3.Properties.AlarmDescription',
    'Alarm if undefined is GreaterThanOrEqualToThreshold 3 within 1 minutes'
  );
  expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.Threshold', 3);
  expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.EvaluationPeriods', 1);
  expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.Period', 5);
  expect(data).toHaveProperty('testqueueMessageAlarm3.Properties.Namespace', 'test');
});
