# Financial Consortium AI

This example demonstrates how to implement the LLM Consortium pattern using an event-based architecture. The pattern orchestrates multiple AI models working together as a consortium to perform complex financial analysis, with an arbiter model coordinating and synthesizing their outputs.

## Key Features

- **LLM Consortium Pattern**: Coordinates multiple AI models (Claude, GPT-4, Gemini) working together as a consortium
- **Event-Based Architecture**: Uses events to manage the workflow between consortium members
- **Arbiter System**: Implements an arbiter model to evaluate, synthesize and refine the consortium's outputs
- **Financial Analysis Demo**: Showcases the pattern through a financial analysis use case

## Architecture

The system implements three main components:

1. **Consortium Members**: Individual LLMs that analyze and provide responses
2. **Arbiter**: A designated LLM that evaluates member responses and synthesizes final output
3. **Event System**: Manages the workflow and communication between components

## How to use

To run the example locally you need to:

1. Sign up for API access with the AI providers (Anthropic, OpenAI, Google)
2. Set up the required environment variables as shown in `.env.example`
3. `npm install` to install dependencies
4. `npm run dev` to start the development server

## Learn More

- [Event-Driven Architecture](https://microservices.io/patterns/data/event-driven-architecture.html)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Ffinancial-consortium-ai&env=ANTHROPIC_API_KEY,OPENAI_API_KEY,GOOGLE_API_KEY&envDescription=API%20keys%20needed%20for%20the%20LLM%20consortium)
