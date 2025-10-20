Launch a new agent to handle complex, multi-step tasks autonomously.

Available agent types and the tools they have access to:
`;return e.forEach(i=>{let o=i.allowedTools.includes("*")||i.allowedTools.length===0?r:i.allowedTools.join(", ");n+=`- ${i.agentType}: ${i.whenToUse}`,i.proactive&&(n+=" (Proactive)"),n+=` (Tools: ${o})
`}),n+=`

## CRITICAL: Agent Type Naming Rules

**IMPORTANT**: When using the Task tool, the subagent_type parameter MUST be EXACTLY the same as the agent type name listed above. Do not modify, abbreviate, or change the naming convention.

**Valid agent type names** (copy exactly as written):
`,e.forEach(i=>{n+=`- "${i.agentType}"
`}),n+=`

**Examples of CORRECT usage:**
- For agent type "code-reviewer" \u2192 subagent_type: "code-reviewer"
- For agent type "general-purpose" \u2192 subagent_type: "general-purpose"
- For agent type "frontend-developer" \u2192 subagent_type: "frontend-developer"

**Examples of INCORRECT usage:**
- code-reviewer \u2192 code_review \u274C
- general-purpose \u2192 general_purpose \u274C
- frontend-developer \u2192 frontend_developer \u274C

## Tool Usage Guidelines

When to use the Task tool:
- When you are instructed to execute custom slash commands. Use the Task tool with the slash command invocation as the entire prompt. The slash command can take arguments. For example: Task(description="Check the file", prompt="/check-file path/to/file.py")
- For complex, multi-step tasks that match the agent descriptions above

When NOT to use the Task tool:
- If you want to read a specific file path, use the ${Lc.Name} or ${J1.Name} tool instead of the Task tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the ${J1.Name} tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the ${Lc.Name} tool instead of the Task tool, to find the match more quickly
- Other tasks that are not related to the agent descriptions above

## Usage Notes

1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. The agent's outputs should generally be trusted
5. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent
6. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.

## Example Usage

<example>
user: "Please write a function that checks if a number is prime"
assistant: Sure let me write a function that checks if a number is prime
assistant: First let me use the ${ld.Name} tool to write a function that checks if a number is prime
assistant: I'm going to use the ${ld.Name} tool to write the following code:
<code>
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}
</code>
<commentary>
Since a significant piece of code was written and the task was completed, now use the code-reviewer agent to review the code
</commentary>
assistant: Now let me use the code-reviewer agent to review the code
assistant: Uses the ${t.Name} tool with subagent_type: "code-reviewer"
</example>

<example>
user: "Hello"
<commentary>
Since the user is greeting, use the greeting-responder agent to respond with a friendly joke
</commentary>
assistant: I'm going to use the ${t.Name} tool with subagent_type: "greeting-responder"
</example
