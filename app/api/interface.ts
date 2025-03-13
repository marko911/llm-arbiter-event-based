import { Workflow, WorkflowEvent } from "@llamaindex/workflow";

export class ResponseNeededEvent extends WorkflowEvent<{
  messages: ChatMessage[];
  model: string;
}> {}

export class MemberAnsweredEvent extends WorkflowEvent<{
  response: string;
  member: string;
}> {}

export class ArbiterNeededEvent extends WorkflowEvent<undefined> {
  constructor() {
    super(undefined);
  }
}

export class IterationNeededEvent extends WorkflowEvent<{
  synthesis: string;
  refinementAreas: string;
}> {}

export class NoneEvent extends WorkflowEvent<undefined> {
  constructor() {
    super(undefined);
  }
}

// Types
export interface AnalysisResponse {
  thoughtProcess: string;
  analysis: string;
  confidence: number;
}

export interface ConsortiumContext {
  responses: Map<string, AnalysisResponse>;
  iteration: number;
  originalData?: string;
  synthesis?: string;
  refinementAreas?: string;
  maxIterations: number;
}

export interface ArbiterAnalysis {
  synthesis: string;
  confidence: number;
  analysis: string;
  dissent: string;
  needsIteration: boolean;
  refinementAreas: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
