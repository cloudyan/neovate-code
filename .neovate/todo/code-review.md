---
name: code-review
description: Run comprehensive multi-agent code review
usage: |
  code-review [options] [files...]
options:
  - name: --categories
    description: Review categories to include (security,performance,quality,architecture)
    type: string
    default: security,performance,quality,architecture
  - name: --severity
    description: Minimum severity level (low,medium,high,critical)
    type: string
    default: medium
  - name: --format
    description: Output format (json,markdown,summary)
    type: string
    default: summary
  - name: --auto-fix
    description: Automatically fix minor issues
    type: boolean
    default: false
  - name: --exclude
    description: File patterns to exclude
    type: string
    multiple: true
    default: []
  - name: --output
    description: Output file path
    type: string
examples:
  - command: code-review
    description: Review all staged files with default settings
  - command: code-review src/**/*.ts --categories security,performance --severity high
    description: Review TypeScript files for security and performance issues (high severity only)
  - command: code-review --format markdown --output review-report.md
    description: Generate detailed markdown report
---

Run comprehensive code review using multiple specialized agents:

## Security Analysis
- **Injection vulnerabilities**: Detect eval(), new Function(), template literal injection
- **XSS prevention**: Identify unsafe innerHTML usage and DOM manipulation
- **Authentication issues**: Find hardcoded passwords, tokens, and API keys
- **Cryptography weaknesses**: Flag weak hashing algorithms (MD5, SHA1)

## Performance Analysis
- **Algorithm efficiency**: Identify inefficient loops and iterations
- **Memory management**: Detect potential memory leaks and large allocations
- **I/O operations**: Flag synchronous file operations blocking the event loop
- **Network optimization**: Identify inefficient API calls and data fetching

## Code Quality Analysis
- **Complexity metrics**: Detect overly complex functions and conditionals
- **Naming conventions**: Identify poor variable and function naming
- **Code duplication**: Find repeated patterns that could be refactored
- **Documentation**: Check for missing or inadequate documentation

## Architectural Analysis
- **Coupling analysis**: Identify modules with too many dependencies
- **Cohesion assessment**: Check if modules have focused responsibilities
- **Pattern consistency**: Verify consistent design patterns usage
- **Layer violations**: Detect improper dependencies between layers

## Priority Levels
- **High**: Security vulnerabilities, performance bottlenecks, architectural violations
- **Medium**: Code quality issues, moderate performance problems
- **Low**: Style issues, minor improvements suggestions

## Integration with Development Workflow

### Pre-commit Hooks
Automatically runs on git commit, analyzing staged files and blocking commits with critical issues.

### Configuration
Configure review settings in `.neovate/code-review.json`:

```json
{
  "enabled": true,
  "severityThreshold": "medium",
  "categories": ["security", "performance", "quality", "architecture"],
  "excludePatterns": ["node_modules/**", "dist/**", "**/*.test.*"],
  "failOnHigh": true,
  "failOnCritical": true,
  "maxFilesPerReview": 20,
  "outputFormat": "summary"
}
```

### CLI Integration
Available as a tool within the Neovate CLI and as a standalone script:

```bash
# Review staged files
bun scripts/code-review-precommit.ts --staged

# Review all changed files
bun scripts/code-review-precommit.ts --changed

# Review specific files
bun scripts/code-review-precommit.ts src/app.ts src/utils.ts
```

## Output Examples

### Summary Format
```
🔍 Running code review on 5 files...
Code review completed. Analyzed 5 files, found 3 issues.

# Code Review Summary

**Total Issues:** 3

## By Category
- security: 1
- quality: 2

## By Priority
- high: 1
- medium: 2

## High Priority Issues
- **Security: injection:** Potential code injection vulnerability detected (src/utils.ts:45)
```

### JSON Format
```json
[
  {
    "category": "security",
    "priority": "high",
    "title": "Security: injection",
    "description": "Potential code injection vulnerability detected: eval",
    "file": "src/utils.ts",
    "line": 45,
    "suggestion": "Avoid using eval(), use JSON.parse() instead",
    "codeExample": "// Bad: eval(userInput)\\n// Good: JSON.parse(userInput)"
  }
]
```

### Markdown Format
```markdown
# Code Review Results

## Security Issues

### Security: injection (high)

**Description:** Potential code injection vulnerability detected: eval

**File:** src/utils.ts:45

**Suggestion:** Avoid using eval(), use JSON.parse() instead

**Example:**
```
// Bad: eval(userInput)
// Good: JSON.parse(userInput)
```
```

## Best Practices

1. **Run reviews frequently**: Integrate with pre-commit hooks for continuous feedback
2. **Configure appropriately**: Adjust severity thresholds based on project requirements
3. **Address high-priority issues**: Focus on security vulnerabilities and performance problems first
4. **Use exclude patterns**: Avoid reviewing generated files, dependencies, and test files
5. **Review reports regularly**: Monitor trends and improvements in code quality over time

## Advanced Usage

### Custom Rules
Extend the review system with custom patterns and rules specific to your project:

```typescript
// Custom security patterns
const CUSTOM_SECURITY_PATTERNS = {
  sqlInjection: [/SELECT.*FROM.*WHERE.*\+/gi],
  pathTraversal: [/[\.\.\/\\]+/gi]
};
```

### Integration with CI/CD
Add to your CI pipeline:

```yaml
- name: Code Review
  run: |
    bun scripts/code-review-precommit.ts --changed
    # Fail build if critical issues found
```

### Team Collaboration
Share review configurations across teams and maintain consistent standards:

```bash
# Share configuration
cp .neovate/code-review.json team-config/
git add team-config/code-review.json
git commit -m "Add shared code review configuration"
```
