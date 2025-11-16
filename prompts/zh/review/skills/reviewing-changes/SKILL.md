---
name: reviewing-changes
version: 2.0.0
description: Comprehensive code reviews for Bitwarden Android. Detects change type (dependency update, bug fix, feature, UI, refactoring, infrastructure) and applies appropriate review depth. Validates MVVM patterns, Hilt DI, security requirements, and test coverage per project standards. Use when reviewing pull requests, checking commits, analyzing code changes, or evaluating architectural compliance.
link: https://github.com/bitwarden/android/blob/main/.claude/skills/reviewing-changes/SKILL.md
---

# Reviewing Changes

## Instructions

**IMPORTANT**: Use structured thinking throughout your review process. Plan your analysis in `<thinking>` tags before providing final feedback. This improves accuracy by 40% according to research.

### Step 1: Check for Existing Review Threads

Always check for existing comment threads to avoid duplicate comments:

<thinking>
Before creating any comments:
1. Is this a fresh review or re-review of the same PR?
2. What existing discussion might already exist?
3. Which findings should update existing threads vs create new?
</thinking>

**Thread Detection Procedure:**

1. **Fetch existing comment count:**
   ```bash
   gh pr view <pr-number> --json comments --jq '.comments | length'
   ```

2. **If count = 0:** No existing threads. Skip to Step 2 (all comments will be new).

3. **If count > 0:** Fetch full comment data to check for existing threads.
   ```bash
   gh pr view <pr-number> --json comments --jq '.comments[] | {id, path, line, body}' > pr_comments.json
   ```

4. **Parse existing threads:** Extract file paths, line numbers, and issue summaries from previous review comments.
   - Build map: `{file:line → {comment_id, issue_summary, resolved}}`
   - Note which issues already have active discussions

5. **Matching Strategy (Hybrid Approach):**
   When you identify an issue to comment on:
   - **Exact match:** Same file + same line number → existing thread found
   - **Nearby match:** Same file + line within ±5 → existing thread found
   - **No match:** Create new inline comment

6. **Handling Evolved Issues:**
   - **Issue persists unchanged:** Respond in existing thread with update
   - **Issue resolved:** Note resolution in thread response (can mark as resolved if supported)
   - **Issue changed significantly:** Resolve/close old thread, create new comment explaining evolution

### Step 2: Detect Change Type

<thinking>
Analyze the changeset systematically:
1. What files were modified? (code vs config vs docs)
2. What is the PR/commit title indicating?
3. Is there new functionality or just modifications?
4. What's the risk level of these changes?
</thinking>

Analyze the changeset to determine the primary change type:

**Detection Rules:**
- **Dependency Update**: Only gradle files changed (`libs.versions.toml`, `build.gradle.kts`) with version number modifications
- **Bug Fix**: PR/commit title contains "fix", "bug", or issue ID; addresses existing broken behavior
- **Feature Addition**: New files, new ViewModels, significant new functionality
- **UI Refinement**: Only UI/Compose files changed, layout/styling focus
- **Refactoring**: Code restructuring without behavior change, pattern improvements
- **Infrastructure**: CI/CD files, Gradle config, build scripts, tooling changes

If changeset spans multiple types, use the most complex type's checklist.

### Step 3: Load Appropriate Checklist

Based on detected type, read the relevant checklist file:

- **Dependency Update** → `checklists/dependency-update.md` (expedited review)
- **Bug Fix** → `checklists/bug-fix.md` (focused review)
- **Feature Addition** → `checklists/feature-addition.md` (comprehensive review)
- **UI Refinement** → `checklists/ui-refinement.md` (design-focused review)
- **Refactoring** → `checklists/refactoring.md` (pattern-focused review)
- **Infrastructure** → `checklists/infrastructure.md` (tooling-focused review)

The checklist provides:
- Multi-pass review strategy
- Type-specific focus areas
- What to check and what to skip
- Structured thinking guidance

### Step 4: Execute Review with Structured Thinking

<thinking>
Before diving into details:
1. What are the highest-risk areas of this change?
2. Which architectural patterns need verification?
3. What security implications exist?
4. How should I prioritize my findings?
5. What tone is appropriate for this feedback?
</thinking>

Follow the checklist's multi-pass strategy, thinking through each pass systematically.

### Step 5: Consult Reference Materials As Needed

Load reference files only when needed for specific questions:

- **Issue prioritization** → `reference/priority-framework.md` (Critical vs Suggested vs Optional)
- **Phrasing feedback** → `reference/review-psychology.md` (questions vs commands, I-statements)
- **Architecture questions** → `reference/architectural-patterns.md` (MVVM, Hilt DI, module org, error handling)
- **Security questions (quick reference)** → `reference/security-patterns.md` (common patterns and anti-patterns)
- **Security questions (comprehensive)** → `docs/ARCHITECTURE.md#security` (full zero-knowledge architecture)
- **Testing questions** → `reference/testing-patterns.md` (unit tests, mocking, null safety)
- **UI questions** → `reference/ui-patterns.md` (Compose patterns, theming)
- **Style questions** → `docs/STYLE_AND_BEST_PRACTICES.md`

### Step 6: Document Findings

## 🛑 STOP: Determine Output Format FIRST

<thinking>
Before writing ANY output, answer this critical question:
1. Did I find ANY issues (Critical, Important, Suggested, or Questions)?
2. If NO issues found → This is a CLEAN PR → Use 2-3 line minimal format and STOP
3. If issues found → Use verdict + critical issues list + inline comments format
4. NEVER create praise sections or elaborate on correct implementations
</thinking>

**Decision Tree:**

```
Do you have ANY issues to report (Critical/Important/Suggested/Questions)?
│
├─ NO → CLEAN PR
│   └─ Use 2-3 line format:
│       "**Overall Assessment:** APPROVE
│        [One sentence describing what PR does well]"
│   └─ STOP. Do not proceed to detailed format guidance.
│
└─ YES → PR WITH ISSUES
    └─ Use minimal summary + inline comments:
        "**Overall Assessment:** APPROVE / REQUEST CHANGES
         **Critical Issues:**
         - [issue with file:line]
         See inline comments for details."
```

## Special Case: Clean PRs with No Issues

When you find NO critical, important, or suggested issues:

**Minimal Approval Format (REQUIRED):**
```
**Overall Assessment:** APPROVE

[One sentence describing what the PR does well]
```

**Examples:**
- "Clean refactoring following established patterns"
- "Solid bug fix with comprehensive test coverage"
- "Well-structured feature implementation meeting all standards"

**NEVER do this for clean PRs:**
- ❌ Multiple sections (Key Strengths, Changes, Code Quality, etc.)
- ❌ Listing everything that was done correctly
- ❌ Checkmarks for each file or pattern followed
- ❌ Elaborate praise or detailed positive analysis
- ❌ Tables, statistics, or detailed breakdowns

**Why brevity matters:**
- Respects developer time (quick approval = move forward faster)
- Reduces noise in PR conversations
- Saves tokens and processing time
- Focuses attention on PRs that actually need discussion

**If you're tempted to write more than 3 lines for a clean PR, STOP. You're doing it wrong.**

---

<thinking>
Before writing each comment:
1. Is this issue Critical, Important, Suggested, or just Acknowledgment?
2. Should I ask a question or provide direction?
3. What's the rationale I need to explain?
4. What code example would make this actionable?
5. Is there a documentation reference to include?
</thinking>

**CRITICAL**: Use summary comment + inline comments approach.

**Review Comment Structure**:
- Create ONE summary comment with overall verdict + critical issues list
- Create separate inline comment for EACH specific issue on the exact line with full details
- Summary directs readers to inline comments ("See inline comments for details")
- Do NOT duplicate issue details between summary and inline comments

### CRITICAL: No Praise-Only Comments

❌ **NEVER** create inline comments solely for positive feedback
❌ **NEVER** create summary sections like "Strengths", "Good Practices", "What Went Well"
❌ **NEVER** use inline comments to elaborate on correct implementations

Focus exclusively on actionable feedback. Reserve comments for issues requiring attention.

**Inline Comment Format** (REQUIRED: Use `<details>` Tags):

**MUST use `<details>` tags for ALL inline comments.** Only severity + one-line description should be visible; all other content must be collapsed.

```
[emoji] **[SEVERITY]**: [One-line issue description]

<details>
<summary>Details and fix</summary>

[Code example or specific fix]

[Rationale explaining why]

Reference: [docs link if applicable]
</details>
```

**Visibility Rule:**
- **Visible:** Severity prefix (emoji + text) + one-line description
- **Collapsed in `<details>`:** Code examples, rationale, explanations, references

**Example inline comment**:
```
⚠️ **CRITICAL**: Exposes mutable state

<details>
<summary>Details and fix</summary>

Change `MutableStateFlow<State>` to `StateFlow<State>`:

\```kotlin
private val _state = MutableStateFlow<State>()
val state: StateFlow<State> = _state.asStateFlow()
\```

Exposing MutableStateFlow allows external mutation, violating MVVM unidirectional data flow.

Reference: docs/ARCHITECTURE.md#mvvm-pattern
</details>
```

**Summary Comment Format (REQUIRED - No Exceptions):**

When you have issues to report, use this format ONLY:

```
**Overall Assessment:** APPROVE / REQUEST CHANGES

**Critical Issues** (if any):
- [One-line summary with file:line reference]

See inline comments for all details.
```

**Maximum Length**: 5-10 lines total, regardless of PR size or complexity.

**No exceptions for**:
- ❌ Large PRs (10+ files)
- ❌ Multiple issue domains
- ❌ High-severity issues
- ❌ Complex changes

All details belong in inline comments with `<details>` tags, NOT in the summary.

**Output Format Rules**:

**What to Include:**
- **Inline comments**: Create separate comment for EACH specific issue with full details in `<details>` tag
- **Summary comment**: Overall assessment (APPROVE/REQUEST CHANGES) + list of CRITICAL issues only
- **Severity levels** (hybrid emoji + text format):
  - ⚠️ **CRITICAL** (blocking)
  - 📋 **IMPORTANT** (should fix)
  - 💡 **SUGGESTED** (nice to have)
  - ❓ **QUESTION** (seeking clarification)

**What to Exclude:**
- **No duplication**: Never repeat inline comment details in the summary
- **No Important/Suggested in summary**: Only CRITICAL blocking issues belong in summary
- **No "Good Practices"/"Strengths" sections**: Never include positive commentary sections
- **No "Action Items" section**: This duplicates inline comments - avoid entirely
- **No verbose analysis**: Keep detailed analysis (compilation status, security review, rollback plans) in inline comments only

### ❌ Common Anti-Patterns to Avoid

**DO NOT:**
- Create multiple summary sections (Strengths, Recommendations, Test Coverage Status, Architecture Compliance)
- Duplicate critical issues in both summary and inline comments
- Write elaborate descriptions in summary (details belong in inline comments)
- Exceed 5-10 lines for simple PRs
- Create inline comments that only provide praise

**DO:**
- Put verdict + critical issue list ONLY in summary
- Put ALL details (explanations, code, rationale) in inline comments with `<details>` collapse
- Keep summary to 5-10 lines maximum, regardless of PR size or your analysis depth
- Focus comments exclusively on actionable issues

**Visibility Guidelines:**
- **Inline comments visible**: Severity + one-line description only
- **Inline comments collapsed**: Code examples, rationale, references in `<details>` tag
- **Summary visible**: Verdict + critical issues list only

See `examples/review-outputs.md` for complete examples.

## Core Principles

- **Minimal reviews for clean PRs**: 2-3 lines when no issues found (see Step 6 format guidance)
- **Issues-focused feedback**: Only comment when there's something actionable; acknowledge good work briefly without elaboration (see priority-framework.md:145-166)
- **Appropriate depth**: Match review rigor to change complexity and risk
- **Specific references**: Always use `file:line_number` format for precise location
- **Actionable feedback**: Say what to do and why, not just what's wrong
- **Constructive tone**: Ask questions for design decisions, explain rationale, focus on code not people
- **Efficient reviews**: Use multi-pass strategy, time-box reviews, skip what's not relevant
