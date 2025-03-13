import { Workflow, StartEvent, StopEvent } from "@llamaindex/workflow";
import {
  AnalysisResponse,
  ArbiterAnalysis,
  ArbiterNeededEvent,
  ConsortiumContext,
  IterationNeededEvent,
  MemberAnsweredEvent,
  NoneEvent,
  ResponseNeededEvent,
} from "./interface";
import Prompt from "../templates/prompt";
import { arbiterPrompt, memberPrompt } from "../templates/consortium";
import { acompletion } from "./acompletion";
import fs from "fs";
import path from "path";

export class FinancialConsortium {
  private members: string[];

  public workflow: Workflow<ConsortiumContext, string, ArbiterAnalysis>;
  private memberPrompt: Prompt;
  private arbiterPrompt: Prompt;
  private arbiter: string;
  constructor() {
    this.workflow = new Workflow<ConsortiumContext, string, ArbiterAnalysis>();
    this.memberPrompt = memberPrompt;
    this.arbiterPrompt = arbiterPrompt;
    this.arbiter = "anthropic/claude-3-5-sonnet-latest";
    this.members = [
      "anthropic/claude-3-5-sonnet-latest",
      "openai/gpt-4o-mini",
      `google/gemini-2.0-flash-001`,
    ];
    this.setupWorkflow();
  }

  private setupWorkflow() {
    this.workflow.addStep(
      {
        inputs: [StartEvent<string>],
        outputs: [],
      },
      async (context, event) => {
        const query = event.data;
        context.data.originalData = query;

        const chatMessages = memberPrompt.chatMessages({
          iteration: context.data.iteration,
          original_prompt: query,
        });

        this.members.forEach((member) => {
          context.sendEvent(
            new ResponseNeededEvent({
              messages: chatMessages,
              model: member,
            })
          );
        });
      }
    );

    this.workflow.addStep(
      {
        inputs: [IterationNeededEvent],
        outputs: [],
      },
      async (context, event) => {
        context.data.synthesis = event.data.synthesis;
        context.data.refinementAreas = event.data.refinementAreas;

        const iteration = context.data.iteration;
        const chatMessages = this.memberPrompt.chatMessages({
          iteration,
          original_prompt: context.data.originalData,
          synthesis: event.data.synthesis,
          refinementAreas: event.data.refinementAreas,
        });

        console.log("Sending messages to members");
        this.members.forEach((member) => {
          context.sendEvent(
            new ResponseNeededEvent({
              messages: chatMessages,
              model: member,
            })
          );
        });
      }
    );

    this.workflow.addStep(
      {
        inputs: [ResponseNeededEvent],
        outputs: [MemberAnsweredEvent],
      },
      async (context, event) => {
        console.log(`${event.data.model} about to answer the query`);

        const response = await acompletion({
          model: event.data.model,
          messages: event.data.messages,
        });

        this.logResponse(event.data.model, response);

        return new MemberAnsweredEvent({
          response,
          member: event.data.model,
        });
      }
    );

    // Step 3: Collect responses and trigger arbiter
    this.workflow.addStep(
      {
        inputs: [MemberAnsweredEvent],
        outputs: [ArbiterNeededEvent, NoneEvent],
      },
      async (context, event) => {
        const parsed: AnalysisResponse = this.parseModelResponse(
          event.data.response
        );
        context.data.responses.set(event.data.member, parsed);

        console.log(`member ${event.data.member} answered the query`);

        if (context.data.responses.size === this.members.length) {
          return new ArbiterNeededEvent();
        }

        return new NoneEvent();
      }
    );

    this.workflow.addStep(
      {
        inputs: [ArbiterNeededEvent],
        outputs: [StopEvent, IterationNeededEvent],
      },
      async (context, event) => {
        console.log("Arbiter needed");
        if (context.data.iteration >= context.data.maxIterations) {
          return new StopEvent("Consortium cant reach agreement");
        }

        const messages = this.arbiterPrompt.chatMessages({
          original_prompt: context.data.originalData,
          responses: Object.fromEntries(context.data.responses),
        });

        this.logArbiterMessages(messages);

        const arbiterResponse = await acompletion({
          model: this.arbiter,
          messages,
        });
        const parsed: ArbiterAnalysis =
          this.parseArbiterResponse(arbiterResponse);

        this.logArbiterResponse(parsed);

        if (
          parsed.needsIteration &&
          context.data.iteration < context.data.maxIterations
        ) {
          context.data.iteration++;
          return new IterationNeededEvent({
            synthesis: parsed.synthesis,
            refinementAreas: parsed.refinementAreas || "",
          });
        }
        return new StopEvent(parsed);
      }
    );
  }

  private parseArbiterResponse(response: string) {
    return {
      synthesis: response.match(/<synthesis>(.*?)<\/synthesis>/s)?.[1] || "",
      confidence: parseFloat(
        response.match(/<confidence>(.*?)<\/confidence>/s)?.[1] || "0"
      ),
      analysis: response.match(/<analysis>(.*?)<\/analysis>/s)?.[1] || "",
      dissent: response.match(/<dissent>(.*?)<\/dissent>/s)?.[1] || "",
      needsIteration:
        response
          .match(/<needs_iteration>(.*?)<\/needs_iteration>/s)?.[1]
          ?.toLowerCase() === "true",
      refinementAreas:
        response.match(/<refinement_areas>(.*?)<\/refinement_areas>/s)?.[1] ||
        "",
    };
  }

  private parseModelResponse(response: string): AnalysisResponse {
    const thoughtProcess =
      response.match(/<thought_process>(.*?)<\/thought_process>/s)?.[1] || "";
    const analysis = response.match(/<analysis>(.*?)<\/analysis>/s)?.[1] || "";
    const confidence = parseFloat(
      response.match(/<confidence>(.*?)<\/confidence>/s)?.[1] || "0"
    );

    return {
      thoughtProcess,
      analysis,
      confidence,
    };
  }

  private logArbiterResponse(parsed: {
    synthesis: string;
    confidence: number;
    analysis: string;
    dissent: string;
    needsIteration: boolean;
    refinementAreas: string;
  }) {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(logDir, `arbiter_response_${timestamp}.log`);

    fs.writeFileSync(
      logPath,
      `
        Timestamp: ${new Date().toISOString()}
        Arbiter Response:
        Synthesis: ${parsed.synthesis}
        Confidence: ${parsed.confidence}
        Analysis: ${parsed.analysis}
        Dissent: ${parsed.dissent}
        Needs Iteration: ${parsed.needsIteration}
        Refinement Areas: ${parsed.refinementAreas}
      `
    );
  }

  private logResponse(member: string, response: string) {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(
      logDir,
      `member_${member.replace("/", "_")}_${timestamp}.log`
    );

    fs.writeFileSync(
      logPath,
      `
        Member: ${member}
        Timestamp: ${new Date().toISOString()}
        Response:
        ${response}
    `
    );
  }

  private logArbiterMessages(messages: any[]) {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(logDir, `arbiter_messages_${timestamp}.log`);

    fs.writeFileSync(
      logPath,
      `
    Timestamp: ${new Date().toISOString()}

    Prompt sent to Arbiter:
    ${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`
    );
  }
}
