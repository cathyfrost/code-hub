export interface QuizExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface QuizTestCase {
  input: string;
  expectedOutput: string;
}

export interface QuizStarterCode {
  [language: string]: string;
}

export interface QuizListItem {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  order: number;
  passed?: boolean;
}

export interface QuizDetail {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  examples: QuizExample[];
  starterCode: QuizStarterCode;
  hints: string | null;
  order: number;
  passed?: boolean;
}

export interface TestCaseResult {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  time?: string;
  memory?: number;
}

export interface SubmitResponse {
  passed: boolean;
  totalCases: number;
  passedCases: number;
  results: TestCaseResult[];
  error?: string;
}