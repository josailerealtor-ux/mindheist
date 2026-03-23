import { StepType } from '../types/trap';
import {
  EvaluationResult,
  StepAnswer,
  StepSolution,
  LogicAnswer,
  LogicStepSolution,
  SequenceAnswer,
  SequenceStepSolution,
  CipherAnswer,
  CipherStepSolution,
  PatternAnswer,
  PatternStepSolution,
  TimingAnswer,
  TimingStepSolution,
} from '../types/engine';

export function evaluate(
  stepType: StepType,
  answer: StepAnswer,
  solution: StepSolution
): EvaluationResult {
  switch (stepType) {
    case 'logic':
      return evaluateLogic(answer as LogicAnswer, solution as LogicStepSolution);
    case 'sequence':
      return evaluateSequence(answer as SequenceAnswer, solution as SequenceStepSolution);
    case 'cipher':
      return evaluateCipher(answer as CipherAnswer, solution as CipherStepSolution);
    case 'pattern':
      return evaluatePattern(answer as PatternAnswer, solution as PatternStepSolution);
    case 'timing':
      return evaluateTiming(answer as TimingAnswer, solution as TimingStepSolution);
  }
}

function evaluateLogic(answer: LogicAnswer, solution: LogicStepSolution): EvaluationResult {
  const solutionKeys = Object.keys(solution.values).sort();
  const answerKeys = Object.keys(answer.values).sort();

  if (solutionKeys.join(',') !== answerKeys.join(',')) {
    return { correct: false, hint: 'Answer is missing required variables.' };
  }

  const correct = solutionKeys.every((k) => answer.values[k] === solution.values[k]);
  return { correct, hint: correct ? undefined : 'One or more variable assignments are wrong.' };
}

function evaluateSequence(answer: SequenceAnswer, solution: SequenceStepSolution): EvaluationResult {
  if (answer.order.length !== solution.order.length) {
    return { correct: false, hint: 'Sequence length does not match.' };
  }
  const correct = answer.order.every((id, i) => id === solution.order[i]);
  return { correct, hint: correct ? undefined : 'The order is not quite right.' };
}

function evaluateCipher(answer: CipherAnswer, solution: CipherStepSolution): EvaluationResult {
  const normalised = answer.plaintext.toLowerCase().trim();
  const correct = normalised === solution.plaintext.toLowerCase().trim();
  return { correct, hint: correct ? undefined : 'Decryption is incorrect.' };
}

function evaluatePattern(answer: PatternAnswer, solution: PatternStepSolution): EvaluationResult {
  const correct = String(answer.answer).trim() === String(solution.answer).trim();
  return { correct, hint: correct ? undefined : 'That value does not fit the pattern.' };
}

function evaluateTiming(answer: TimingAnswer, solution: TimingStepSolution): EvaluationResult {
  const diff = Math.abs(answer.elapsedMs - solution.targetMs);
  const correct = diff <= solution.windowMs;
  return {
    correct,
    hint: correct ? undefined : `Off by ${diff}ms — try to match the timing more precisely.`,
  };
}
