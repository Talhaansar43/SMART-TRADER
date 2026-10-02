# Copilot Instructions — smart-trader

> This file provides GitHub Copilot with project-wide context.
> Keeping this concise and accurate reduces token usage by 20-30%.
> Last updated: 2026-10-02

## Stack & versions
- (update with your actual stack)

## Project conventions
- Follow existing naming in the file you're editing
- Write tests alongside implementation (co-located __tests__ or test_ files)
- Prefer explicit types over inference for public APIs
- Financial values: always use Decimal, never float
- No console.log / print in production paths — use the project logger

## File structure
```

```

## Token-efficient workflow
- **Plan first**: Use agent mode to draft a plan before implementation; review it before generating code
- **Scoped context**: Use #file, #selection, #symbol references — avoid pasting full file contents in chat
- **Chat hygiene**: Start a new chat (Ctrl+N / Cmd+N) when switching topics; use /compact to summarize long sessions
- **Forking**: Use /fork or hover → Fork Conversation to explore alternatives without re-establishing full context
- **Model selection**: Leave model on auto — VS Code routes each request to the most efficient model per task type
- **Thinking effort**: Use default adaptive thinking; only set to "high" for architectural decisions with genuine complexity
- **Token visibility**: Use Copilot Agent Debug Logs (Command Palette: "Copilot: Open Chat Debug View") to inspect usage

## Chat context management
- When a conversation exceeds **5 exchanges**, treat only the **last 5 user + assistant turns** as active context unless an earlier message is explicitly referenced via #file or #symbol.
- Discard earlier turns to avoid stale or contradictory instructions creeping back in.
- To override this limit for a specific request, append `#ctx:N` at the end of your prompt (e.g. `#ctx:3` to use only the last 3 turns, or `#ctx:all` to include the full history).
- To reset context entirely, start a new chat with `Ctrl+N` / `Cmd+N` rather than continuing a long thread.

### Shorthand reference
| Shorthand | Meaning |
|---|---|
| `#ctx:3` | Use only the last 3 messages as context |
| `#ctx:5` | Use only the last 5 messages as context (default cap) |
| `#ctx:all` | Include full conversation history |
| `#ctx:reset` | Treat this as the start of a fresh conversation |

## Do not
- Do not use `any` in TypeScript or Python without a `# type: ignore` comment explaining why
- Do not write migration files manually — use the ORM CLI
- Do not commit secrets, API keys, or connection strings
- Do not add dependencies without updating the relevant lock file
- Do not use float for financial calculations
