# Quiz Workflow — GPT PDF Report Analysis

Tracked results for the quiz workflow's document pipeline:
user upload → OpenAI analysis → generated PDF report.

Kept in git so report quality can be compared across iterations of the
prompt in `src/module/workflow/file-workflow.service.ts` and the template
in `src/assets/pdf/template/analysis-report.template.html`.

## Layout

`runs/<date>-<analysisId>/`

| File | Contents |
| --- | --- |
| `source.pdf` | Document sent to GPT |
| `source.md` | Extracted text of the source |
| `output.pdf` | Generated report |
| `output.md` | Extracted text of the report |
| `review.md` | Findings: hallucinations, formatting defects, prompt notes |

Extract text with:

```powershell
node scripts/pdf/extract-pdf-text.js <file.pdf>
```
