import { Rule } from '../types';
import { complexityRule } from './complexity.rule';
import { namingRule } from './naming.rule';
import { asyncRule } from './async.rule';
import { errorHandlingRule } from './errorHandling.rule';
import { performanceRule } from './performance.rule';
import { securityRule } from './security.rule';
import { bestPracticeRule } from './bestPractice.rule';
import { nodeSpecificRule } from './nodeSpecific.rule';

export const rules: Rule[] = [
  complexityRule,
  namingRule,
  asyncRule,
  errorHandlingRule,
  performanceRule,
  securityRule,
  bestPracticeRule,
  nodeSpecificRule
];
