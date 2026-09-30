# Analysis: Input vs. GPT-Generated Output

Comparing `input-Contract-ITServices-AdamCox.md` (uploaded file) against `output-073d43d0-analysis-report.md` (GPT-generated report), and the code that produced it.

## The Prompt Used

From [`src/module/workflow/file-workflow.service.ts`](../../src/module/workflow/file-workflow.service.ts):

```ts
const analysisPrompt =
  request.customPrompt ||
  `Analyze this document and provide a comprehensive professional report. Focus on:

1. **Executive Summary**: Brief overview of the document's key points
2. **Key Findings**: Most important discoveries or insights
3. **Detailed Analysis**: Break down the document into logical sections
4. **Recommendations**: Actionable insights and next steps

For each section, provide clear, concise content that would be suitable for a professional report.`;
```

In this test, `customPrompt` was supplied as `"Please analyze the file and provide a report."` (from the query string), so the more detailed structured prompt above was **not** actually used — GPT only received the short generic instruction. Model: `gpt-4o-mini`, requested via `analyzeFileAsStructured` in [`src/module/gpt/gpt.service.ts`](../../src/module/gpt/gpt.service.ts).

## What Went Well

1. **Structure**: GPT organized the short input paragraph into a proper `AnalysisContentDto` shape — title, summary, key findings, multiple named sections with bullet-point key points, and recommendations. This matches the template contract in [`analysis-content.dto.ts`](../../src/module/pdf/dto/analysis-content.dto.ts).
2. **Section coverage**: It correctly pulled out the three real contractual themes present in the input — payment terms, termination/liability, and confidentiality/non-competition — as separate sections rather than one blob.
3. **Tone**: Output reads as a professional report, appropriate for the target audience (business/legal reviewer), not just a repeat of the input.

## Problems Found

### 1. Likely hallucinated dollar figure
Output states: *"the total amount payable is capped at $176,175.00."*
The input text never states a capped total — only "$90 per hour" and "270 billable days" (days, not hours). $176,175 doesn't derive cleanly from either unit (270 × 90 = $24,300; a full 270 eight-hour days × $90/hr = $194,400). This number is not traceable to the source and should be treated as a hallucination. **Fix**: add an explicit prompt instruction such as *"Only state figures that are explicitly present in the source text. If a total must be derived, show your calculation."*

### 2. Duplicated title in the PDF
Extracted output text shows the title line **twice** in a row:
```
adam_cox__vorba_com/...pdf - Analysis Report
adam_cox__vorba_com/...pdf - Analysis Report
```
Root cause confirmed in [`src/assets/pdf/template/analysis-report.template.html`](../../src/assets/pdf/template/analysis-report.template.html): `{{title}}` is rendered twice — once in the header block (line 192) and again as an `<h2>` (line 213). **Fix**: remove one of the two `{{title}}` bindings from the template.

### 3. Unescaped HTML entities in text
Output contains raw `&#x27;` instead of an apostrophe (e.g. `VORBA&#x27;s actions`, `SOA&#x27;s business interests`). This means Handlebars HTML-escaped the GPT text (correct, since it's untrusted content) but the entity is never decoded back before/while rendering as plain text — it leaks through as literal characters in the rendered PDF. **Fix**: either use a triple-stache/`{{{ }}}` binding with proper sanitization for this specific field, or decode HTML entities before laying out text if the render path treats it as plain text rather than real HTML.

### 4. Token usage always reported as zero
In [`src/module/workflow/workflow.controller.ts`](../../src/module/workflow/workflow.controller.ts), the response `usage` object is hardcoded:
```ts
usage: {
  promptTokens: 0, // TODO: Get from GPT response
  completionTokens: 0,
  totalTokens: 0,
},
```
This means actual OpenAI token/cost usage is never surfaced to the caller or logged, which matters directly for the billing issue encountered during this same test session (running out of credits with no visibility into consumption). **Fix**: read `response.usage` from the OpenAI SDK response and pass it through.

### 5. Test input file is itself a prior analysis report
The "input" filename is `Contract-ITServices___AdamCox-2023-02-16.docx_analysis_report.pdf` — i.e., it already carries the `_analysis_report` suffix your own upload pipeline appends. This strongly suggests the fixture being uploaded for this test is a **previously generated report being re-analyzed**, not the original source contract. That would explain why the "input" is a single short summary paragraph instead of a full multi-clause legal document. This isn't a bug, but it means this particular test is exercising a "summarize a summary" path rather than the real "analyze an original document" path — worth using a genuine multi-page original contract fixture for more representative testing.

## Recommendations Going Forward

1. **Ground numeric claims**: Update the analysis prompt to forbid fabricated numbers not present in source text.
2. **Fix template duplication**: Remove the redundant `{{title}}` binding in `analysis-report.template.html`.
3. **Fix entity leakage**: Decode HTML entities before rendering as PDF text content, or adjust the Handlebars binding for GPT-authored fields.
4. **Wire up real token usage**: Replace hardcoded zeros with the actual `usage` object from the OpenAI response for cost visibility.
5. **Use a real multi-page contract fixture** for future tests to exercise this pipeline more realistically than a one-paragraph summary.
6. Consider extracting text server-side (e.g. `pdf-parse`) before sending to GPT rather than uploading the raw PDF via the Files API — gives you a chance to validate/clean content and reduces token cost, since right now the model is doing its own PDF parsing internally.
