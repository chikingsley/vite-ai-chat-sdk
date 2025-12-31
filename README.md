<h1 align="center">Vite AI Chat SDK</h1>

<p align="center">
    A free, open-source AI chat template built with Vite, React, Elysia, and the AI SDK.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Vite](https://vitejs.dev) + [React](https://react.dev)
  - Fast development with HMR
  - Modern React with hooks and components
- [Elysia](https://elysiajs.com) Backend
  - Fast, type-safe server with Bun
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports multiple model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - PostgreSQL for saving chat history and user data
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [AI SDK](https://ai-sdk.dev/docs/introduction) with the gateway provider to access multiple AI models. You can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Google](https://ai.google.dev/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run the app. Copy `.env.example` to `.env.local` and fill in the values.

> Note: You should not commit your `.env` file or it will expose secrets.

```bash
bun install
bun db:migrate # Setup database or apply latest database changes
bun dev
```

Your app should now be running on [localhost:5173](http://localhost:5173).
