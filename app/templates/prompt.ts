import nunjucks from "nunjucks";
import { ChatMessage } from "../api/interface";

class ChatExtension {
  tags = ["chat"];

  parse(parser: any, nodes: any) {
    const token = parser.nextToken();
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(token.value);
    const body = parser.parseUntilBlocks("endchat");
    parser.advanceAfterBlockEnd();
    return new nodes.CallExtension(this, "run", args, [body]);
  }

  run(context: any, args: any, body: any) {
    return `{% chat role="${args.role}" %}${body()}{% endchat %}`;
  }
}

export default class Prompt {
  private template: string;
  private env: nunjucks.Environment;

  constructor(template: string) {
    this.template = template;
    this.env = nunjucks.configure({
      autoescape: false,
      watch: false,
    });
    this.env.addFilter("items", (obj: any) => Object.entries(obj));
    this.env.addExtension("ChatExtension", new ChatExtension());
  }

  chatMessages(context: Record<string, any>): Array<ChatMessage> {
    const rendered = this.env.renderString(this.template, context);
    return this.parseChatBlocks(rendered);
  }

  private parseChatBlocks(content: string): Array<ChatMessage> {
    const messages: Array<ChatMessage> = [];
    const regex = /{% chat role="(.*?)" %}(.*?){% endchat %}/gs;
    let match;
    while ((match = regex.exec(content)) !== null) {
      messages.push({
        role: match[1] as "system" | "user" | "assistant",
        content: match[2].trim(),
      });
    }
    return messages;
  }
}
