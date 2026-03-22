# ScoreMate IELTS Reading Module - CSS Design Guide

Quick reference for Claude implementation. Use alongside HTML mockup and PDF dev spec.

---

## 1. Design Tokens

### Color Palette

| Purpose | Value | Usage |
|---------|-------|-------|
| Primary Blue | `#2563eb` | Headers, active states, links, primary buttons |
| Primary Blue (Dark) | `#1d4ed8` | Hover states on blue elements |
| Text - Primary | `#000000` (or `rgb(0, 0, 0)`) | Main body text, question text, headings |
| Text - Secondary | `#6b7280` | Secondary info, hints, less important text |
| Border - Standard | `#d3d3d3` (or `rgb(211, 211, 211)`) | Input borders, dividers |
| Border - Section | `#e5e7eb` | Section dividers, question containers |
| Background - Page | `#f5f5f5` | Overall page background |
| Background - White | `#ffffff` | Panels, containers, white backgrounds |
| Success/Submit | `#16a34a` | Submit button, success states |
| Error | `#dc2626` | Error messages, validation |
| Warning | `#f59e0b` | Warning messages, alerts |

**CSS Variable Definition:**
```css
:root {
  --color-primary-blue: #2563eb;
  --color-primary-blue-dark: #1d4ed8;
  --color-text-primary: rgb(0, 0, 0);
  --color-text-secondary: #6b7280;
  --color-border: rgb(211, 211, 211);
  --color-border-section: #e5e7eb;
  --color-bg-page: #f5f5f5;
  --color-bg-white: #ffffff;
  --color-success: #16a34a;
  --color-error: #dc2626;
  --color-warning: #f59e0b;
}
```

### Typography

| Element | Font-size | Font-weight | Line-height | Notes |
|---------|-----------|-------------|-------------|-------|
| Passage text | 18px | 400 (normal) | 36px | Primary reading content |
| Question text | 18px | 400 (normal) | 27px | Stem and display text |
| Section header | 18px | 700 (bold) | 1.2 | "Questions X-Y" style headers |
| Instructions | 18px | 400 (normal) | 1.4 | Directive text (Find the paragraph) |
| Constraint text | 18px | 700 (bold) | 1.4 | "ONE WORD ONLY", "TWO WORDS ONLY" etc (also uppercase feel) |
| Question number | 18px | 700 (bold) | 1 | Numbers in boxes |
| Option letter | 17px | 700 (bold) | 1 | A, B, C, D etc in circles |
| Timer | 18px | 600 | 1 | Countdown timer display |

**CSS Font Definition:**
```css
:root {
  --font-family-primary: -apple-system, "system-ui", "Segoe UI", Roboto, 
                          Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", 
                          sans-serif;
}

body {
  font-family: var(--font-family-primary);
  font-size: 16px;
  color: var(--color-text-primary);
}
```

### Spacing (Vertical/Layout)

| Element | Value | Usage |
|---------|-------|-------|
| Question container padding | 20px | Internal padding in question sections |
| Question section margin-bottom | 54px | Space between different question groups |
| Question item margin-bottom | 27px | Space between individual questions |
| Radio option padding | 8px 0 | Vertical spacing in radio option groups |
| Gap between question groups | 40px | Large separator between sections |

**CSS Spacing Pattern:**
```css
.question-section {
  padding: 20px;
  margin-bottom: 54px;
}

.question-item {
  margin-bottom: 27px;
}

.radio-option {
  padding: 8px 0;
}
```

### Dimensions (Fixed Sizes)

| Element | Width | Height | Border-radius | Notes |
|---------|-------|--------|----------------|-------|
| Text input | 144px | auto | 2px | For completion/fill-in types |
| Select dropdown | 144px | auto | 2px | For drop-down types |
| Question number box | 30px | 30px | 2px | Square with slight radius |
| Option letter circle | 30px | 30px | 50% | Perfect circle |
| Panel divider | 8px | full height | 0 | Resizable splitter |

**CSS Dimension Definitions:**
```css
input[type="text"].text-answer {
  width: 144px;
  border-radius: 2px;
  border: 1px solid var(--color-border);
}

select.select-answer {
  width: 144px;
  border-radius: 2px;
  padding: 2px;
  border: 1px solid var(--color-border);
}

.question-number {
  width: 30px;
  height: 30px;
  border-radius: 2px;
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-letter {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-divider {
  width: 8px;
  cursor: col-resize;
  background-color: #d3d3d3;
}
```

---

## 2. Component CSS Reference

### Root Container - Split Panel Layout

```css
.reading-test-container {
  display: grid;
  grid-template-columns: 1fr 8px 1fr;
  height: calc(100vh - 60px - 50px); /* Subtract header and footer heights */
  gap: 0;
  background-color: var(--color-bg-page);
}
```

### Left Panel - Passage Panel

```css
.panel-left {
  overflow-y: auto;
  padding: 20px;
  background-color: var(--color-bg-white);
  border-right: 1px solid var(--color-border-section);
}

.panel-left::-webkit-scrollbar {
  width: 8px;
}

.panel-left::-webkit-scrollbar-track {
  background: var(--color-bg-page);
}

.panel-left::-webkit-scrollbar-thumb {
  background: #999;
  border-radius: 4px;
}
```

### Right Panel - Question Panel

```css
.panel-right {
  overflow-y: auto;
  padding: 20px;
  background-color: var(--color-bg-white);
}

.panel-right::-webkit-scrollbar {
  width: 8px;
}

.panel-right::-webkit-scrollbar-track {
  background: var(--color-bg-page);
}

.panel-right::-webkit-scrollbar-thumb {
  background: #999;
  border-radius: 4px;
}
```

### Panel Divider (Draggable Splitter)

```css
.panel-divider {
  width: 8px;
  background-color: #d3d3d3;
  cursor: col-resize;
  user-select: none;
  transition: background-color 0.2s ease;
}

.panel-divider:hover {
  background-color: #999;
}

.panel-divider.dragging {
  background-color: #2563eb;
}
```

### Passage Title

```css
.passage-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 20px;
  line-height: 1.4;
}
```

### Passage Paragraph Text

```css
.passage-text {
  margin-bottom: 16px;
}

.passage-text p {
  font-size: 18px;
  line-height: 36px;
  color: var(--color-text-primary);
  margin: 0;
  margin-bottom: 16px;
}

.passage-text p:last-child {
  margin-bottom: 0;
}
```

### Question Section Container (Bordered Group)

```css
.question-section {
  padding: 20px;
  margin-bottom: 54px;
  border: 1px solid var(--color-border-section);
  border-radius: 4px;
  background-color: var(--color-bg-white);
}

.question-section:last-child {
  margin-bottom: 0;
}
```

### Question Section Header (Questions X-Y)

```css
.question-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-border-section);
}

.question-section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
```

### Question Section Instruction (Find the paragraph that...)

```css
.question-section-instruction {
  font-size: 18px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  line-height: 1.4;
  font-style: italic;
}
```

### Question Item Container

```css
.question-item {
  margin-bottom: 27px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-item:last-child {
  margin-bottom: 0;
}
```

### Question Number Box

```css
.question-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #000;
  border-radius: 2px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  background-color: var(--color-bg-white);
  margin-right: 8px;
  flex-shrink: 0;
}
```

### Question Text (Inline with Question Number)

```css
.question-text-inline {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.question-text-inline .question-number {
  margin-right: 0;
  margin-top: 0;
}

.question-text-inline .question-stem {
  font-size: 18px;
  font-weight: 400;
  line-height: 27px;
  color: var(--color-text-primary);
}
```

### Radio Group & Options

```css
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
  margin-left: 38px; /* Align with question number width + gap */
}

.radio-option {
  display: flex;
  align-items: center;
  padding: 8px 0;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  cursor: pointer;
  margin: 0;
  width: 18px;
  height: 18px;
}

.radio-option input[type="radio"]:focus {
  outline: 2px solid var(--color-primary-blue);
  outline-offset: 2px;
}

.radio-option:hover {
  background-color: rgba(37, 99, 235, 0.05);
}

.radio-option input[type="radio"]:checked + .option-letter {
  background-color: var(--color-primary-blue);
  color: white;
  border-color: var(--color-primary-blue);
}
```

### Option Letter Circle (A/B/C/D)

```css
.option-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #000;
  border-radius: 50%;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  background-color: var(--color-bg-white);
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.radio-option input[type="radio"]:checked + .option-letter {
  background-color: var(--color-primary-blue);
  color: white;
  border-color: var(--color-primary-blue);
}
```

### Option Text

```css
.option-text {
  font-size: 18px;
  font-weight: 400;
  line-height: 27px;
  color: var(--color-text-primary);
  flex: 1;
}

.radio-option input[type="radio"]:checked ~ .option-text {
  font-weight: 500;
}
```

### Checkbox Option (Multiple Select)

```css
.checkbox-option {
  display: flex;
  align-items: center;
  padding: 8px 0;
  gap: 8px;
  cursor: pointer;
  margin-left: 38px; /* Align with question structure */
}

.checkbox-option input[type="checkbox"] {
  cursor: pointer;
  margin: 0;
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary-blue);
}

.checkbox-option input[type="checkbox"]:focus {
  outline: 2px solid var(--color-primary-blue);
  outline-offset: 2px;
}

.checkbox-option:hover {
  background-color: rgba(37, 99, 235, 0.05);
}

.checkbox-option input[type="checkbox"]:checked {
  background-color: var(--color-primary-blue);
}
```

### Select/Dropdown Answer

```css
.select-answer {
  width: 144px;
  padding: 4px 2px;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 16px;
  font-family: var(--font-family-primary);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.select-answer:hover {
  border-color: var(--color-primary-blue);
}

.select-answer:focus {
  outline: 2px solid var(--color-primary-blue);
  outline-offset: 0;
  border-color: var(--color-primary-blue);
}
```

### Text Input Answer

```css
.text-answer {
  width: 144px;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 16px;
  font-family: var(--font-family-primary);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
}

.text-answer:hover {
  border-color: var(--color-primary-blue);
}

.text-answer:focus {
  outline: 2px solid var(--color-primary-blue);
  outline-offset: 0;
  border-color: var(--color-primary-blue);
}

.text-answer::placeholder {
  color: var(--color-text-secondary);
}
```

### Option Pool Box (Matching Type - List of Available Options)

```css
.option-pool-box {
  margin-top: 12px;
  margin-left: 38px;
  padding: 12px;
  background-color: var(--color-bg-page);
  border: 1px solid var(--color-border-section);
  border-radius: 2px;
}

.option-pool-box .pool-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option-pool-box .pool-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-pool-box .pool-item {
  display: inline-block;
  padding: 4px 12px;
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 16px;
  color: var(--color-text-primary);
}
```

### Constraint Text (ONE WORD ONLY, etc.)

```css
.constraint-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
  margin-left: 38px;
}
```

### Completion Paragraph (Inline Text with Blanks)

```css
.completion-paragraph {
  font-size: 18px;
  line-height: 27px;
  color: var(--color-text-primary);
  margin-left: 38px;
  margin-top: 8px;
}

.completion-paragraph .text-answer {
  margin: 0 4px;
  vertical-align: middle;
}

.completion-paragraph::after {
  content: '';
}
```

### Table Completion

```css
.table-completion {
  margin-top: 12px;
  margin-left: 38px;
  border-collapse: collapse;
  width: 100%;
  max-width: 600px;
}

.table-completion th,
.table-completion td {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
  font-size: 16px;
}

.table-completion th {
  background-color: var(--color-bg-page);
  font-weight: 600;
  color: var(--color-text-primary);
}

.table-completion td {
  background-color: var(--color-bg-white);
}

.table-completion .text-answer {
  width: 120px;
}
```

### Flow Chart Container

```css
.flow-chart-container {
  margin-top: 16px;
  margin-left: 38px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
}
```

### Flow Step / Arrow

```css
.flow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--color-bg-page);
  border: 1px solid var(--color-border-section);
  border-radius: 2px;
  font-size: 16px;
  color: var(--color-text-primary);
}

.flow-step .text-answer {
  width: 120px;
  margin: 0;
}

.flow-arrow {
  text-align: center;
  font-size: 20px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1;
}
```

### Diagram Container

```css
.diagram-container {
  margin-top: 16px;
  margin-left: 38px;
  padding: 12px;
  background-color: var(--color-bg-page);
  border: 1px solid var(--color-border-section);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
}

.diagram-container svg {
  max-width: 100%;
  height: auto;
}

.diagram-container .text-answer {
  width: 120px;
}
```

### Header Bar

```css
.header-bar {
  background-color: var(--color-primary-blue);
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-bar h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

.header-bar .timer {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
```

### Bottom Navigation / Question Bubbles

```css
.bottom-nav {
  background-color: var(--color-primary-blue);
  padding: 10px 20px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  height: auto;
  min-height: 50px;
  align-items: center;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.nav-part {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.nav-part::after {
  content: '';
  width: 1px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.3);
  margin: 0 4px;
}

.nav-part:last-child::after {
  content: none;
}

.question-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.question-bubble:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.question-bubble.answered {
  background-color: rgba(22, 163, 74, 0.7);
  border-color: #16a34a;
}

.question-bubble.current {
  background-color: white;
  color: var(--color-primary-blue);
  font-weight: 700;
}
```

### Submit Button

```css
.submit-button {
  background-color: var(--color-success);
  color: white;
  border: none;
  padding: 10px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family-primary);
}

.submit-button:hover {
  background-color: #15803d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.submit-button:active {
  transform: scale(0.98);
}

.submit-button:disabled {
  background-color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.submit-button:focus {
  outline: 2px solid var(--color-primary-blue);
  outline-offset: 2px;
}
```

---

## 3. Pattern-Specific Implementation Notes

### Pattern 1: Multiple Choice (Single Answer)

**DOM Structure:**
```html
<div class="question-item">
  <div class="question-text-inline">
    <span class="question-number">1</span>
    <span class="question-stem">Question stem text here</span>
  </div>
  <fieldset class="radio-group">
    <legend class="sr-only">Choose one answer</legend>
    <label class="radio-option">
      <input type="radio" name="q1" value="A" />
      <span class="option-letter">A</span>
      <span class="option-text">Option A text</span>
    </label>
    <label class="radio-option">
      <input type="radio" name="q1" value="B" />
      <span class="option-letter">B</span>
      <span class="option-text">Option B text</span>
    </label>
    <!-- More options -->
  </fieldset>
</div>
```

**Key CSS Considerations:**
- Radio inputs must have proper labels
- Option letter circles must align vertically
- Hover state should highlight entire row
- Selected state should fill circle with blue, text white
- Focus visible on radio input with outline

**Interactive States:**
- Hover: `background-color: rgba(37, 99, 235, 0.05)` on .radio-option
- Selected: Blue fill on .option-letter, white text
- Focus: `outline: 2px solid var(--color-primary-blue)` on input

**Responsive Behavior:**
- On very narrow screens (< 768px), consider stacking layout differently
- Option letter circles should never wrap to next line if possible

---

### Pattern 2: Multiple Answers (Checkboxes)

**DOM Structure:**
```html
<div class="question-item">
  <div class="question-text-inline">
    <span class="question-number">5</span>
    <span class="question-stem">Select TWO correct answers</span>
  </div>
  <fieldset class="checkbox-group">
    <legend class="sr-only">Select multiple answers</legend>
    <label class="checkbox-option">
      <input type="checkbox" name="q5" value="A" />
      <span class="option-letter">A</span>
      <span class="option-text">Option text</span>
    </label>
    <!-- More options -->
  </fieldset>
</div>
```

**Key CSS Considerations:**
- Checkboxes should use `accent-color` for modern browsers
- Multiple selections allowed visually
- Spacing same as radio options

**Interactive States:**
- Checked state: checkbox filled with blue
- Hover: Same subtle highlight as radio

---

### Pattern 3: Sentence/Paragraph Completion

**DOM Structure:**
```html
<div class="question-item">
  <div class="question-text-inline">
    <span class="question-number">12</span>
    <span class="question-stem">Complete the sentence</span>
  </div>
  <p class="completion-paragraph">
    The company is located in
    <input type="text" class="text-answer" name="q12" />
    and was founded in
    <input type="text" class="text-answer" name="q12b" />
  </p>
  <div class="constraint-text">ONE WORD ONLY</div>
</div>
```

**Key CSS Considerations:**
- Text inputs must be inline with paragraph
- Must have visual bottom border only (no full border)
- Width consistently 144px
- Line-height must match surrounding text (27px) for proper alignment
- Constraint text positioned below with margin

**Interactive States:**
- Focus: Bottom border changes to blue, outline appears
- Error state: Border color changes to error red

---

### Pattern 4: Matching (List with Pool of Options)

**DOM Structure:**
```html
<div class="question-section">
  <div class="question-section-header">
    <h3 class="question-section-title">Questions 14-17</h3>
  </div>
  <p class="question-section-instruction">
    Match each paragraph to a list item
  </p>
  
  <div class="option-pool-box">
    <div class="pool-label">Select your answer from below</div>
    <div class="pool-items">
      <div class="pool-item">Option 1</div>
      <div class="pool-item">Option 2</div>
      <!-- ... -->
    </div>
  </div>
  
  <div class="question-item">
    <div class="question-text-inline">
      <span class="question-number">14</span>
      <span class="question-stem">The first paragraph describes...</span>
    </div>
    <select class="select-answer" name="q14">
      <option value="">-- Select --</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </select>
  </div>
  <!-- More questions -->
</div>
```

**Key CSS Considerations:**
- Pool box displayed once per section
- Pool items shown as inline blocks with borders
- Dropdown width consistently 144px
- Question structure same as completion

**Interactive States:**
- Dropdown expand/collapse handled by browser
- Focus visible on select element

---

### Pattern 5: Classification/Diagram Completion

**DOM Structure:**
```html
<div class="question-item">
  <div class="question-text-inline">
    <span class="question-number">23</span>
    <span class="question-stem">Complete the table using the words below</span>
  </div>
  
  <!-- Table option -->
  <table class="table-completion">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Row header</td>
        <td><input type="text" class="text-answer" name="q23_1" /></td>
      </tr>
      <!-- More rows -->
    </tbody>
  </table>
  
  <!-- OR Flow chart option -->
  <div class="flow-chart-container">
    <div class="flow-step">
      Step 1:
      <input type="text" class="text-answer" name="q26_1" />
    </div>
    <div class="flow-arrow">↓</div>
    <div class="flow-step">
      Step 2:
      <input type="text" class="text-answer" name="q26_2" />
    </div>
  </div>
  
  <!-- OR Diagram option -->
  <div class="diagram-container">
    <!-- SVG or image -->
    <input type="text" class="text-answer" name="q29_label1" placeholder="Label 1" />
  </div>
  
  <div class="constraint-text">NO MORE THAN TWO WORDS</div>
</div>
```

**Key CSS Considerations:**
- Table: Full border, proper cell padding, centered headers
- Flow chart: Vertical layout with arrow indicators
- Diagram: Container with background, inline inputs for labels
- All constraint text positioned below
- Consistent 144px input widths

---

## 4. Accessibility Checklist

### Form Inputs
- [ ] All `<input>` elements have associated `<label>` or aria-label
- [ ] All radio groups use `<fieldset>` and `<legend>`
- [ ] All checkboxes use `<fieldset>` and `<legend>`
- [ ] Select dropdowns have descriptive labels

### Focus Management
- [ ] Focus indicators visible on all interactive elements
- [ ] Focus order logical (top to bottom, left to right)
- [ ] Focus trap in question section (if modal-like)
- [ ] Focus restoration after interaction

### Color & Contrast
- [ ] Text color contrast >= 4.5:1 for normal text
- [ ] Text color contrast >= 3:1 for large text (18px+)
- [ ] Color not sole indicator of state (use icons, text, etc.)
- [ ] Success/error states have text label in addition to color

### Semantic HTML
- [ ] Use proper heading hierarchy (h1, h2, h3)
- [ ] Use `<fieldset>` for radio/checkbox groups
- [ ] Use semantic input types (text, radio, checkbox, number)
- [ ] Use table semantics for table-based questions

### Screen Readers
- [ ] Question numbers read aloud as "question 1", etc.
- [ ] Option letters read aloud (A, B, C, D)
- [ ] Constraint text ("ONE WORD ONLY") is readable
- [ ] Section headers identify question ranges
- [ ] Error messages announced clearly

### Keyboard Navigation
- [ ] Tab moves focus through all inputs
- [ ] Shift+Tab moves backward
- [ ] Radio/checkbox groups navigable with arrow keys
- [ ] Enter/Space selects options
- [ ] Submit button accessible via keyboard

---

## 5. Screenshot Annotations & Key Observations

### Layout Observations
**Split Panel (50/50 Split)**
- Left panel: ~50% width, contains passage text
- Right panel: ~50% width, contains questions
- Divider: 8px wide, cursor changes to `col-resize` on hover
- Both panels scroll independently
- Divider can be dragged to resize (JavaScript required)

**Passage Panel**
- Left-aligned paragraphed text
- 18px font, 36px line-height for readability
- Generous left/right padding (20px)
- No maximum width constraint initially
- Scrolls independently of questions

**Question Section Layout**
- Clear bordered containers (1px solid #e5e7eb)
- Header with "Questions X-Y" title bold, 18px
- Optional instruction text in secondary color
- 54px margin-bottom between sections for clear separation

**Individual Question Structure**
- Question number in 30x30 box (border-radius 2px)
- Number box positioned inline left of question text
- Question text follows number with 8px gap
- Full question text fits on single or multiple lines
- Total left indent: 38px (30px box + 8px gap)

**Radio Options**
- Vertically stacked below question
- Each option: letter circle (30x30, border-radius 50%) + text
- Consistent 38px left indent (aligns with question structure)
- 8px vertical padding between options
- Hover state: subtle blue background highlight
- Selected state: circle filled with blue (#2563eb), white text

**Dropdowns & Text Inputs**
- Appear inline within question or completion text
- 144px width for both
- 2px border-radius, 1px border
- Must align vertically with surrounding 18px text

**"NB: You may use any letter more than once" Note**
- Appears in italics and bold
- Secondary color text
- Positioned prominently in matching sections
- Same font size as instructions (18px)

### Interactive States
- **Hover on radio option**: Subtle background highlight (rgba(37, 99, 235, 0.05))
- **Selected radio option**: Circle filled blue, white letter/text bold
- **Hover on submit**: Darker green (#15803d), subtle shadow
- **Focus on any input**: 2px solid outline in primary blue, 2px offset

### Responsive Considerations
- At 768px+: Full split panel layout
- At <768px: Consider single column layout (passage above questions)
- Inputs remain 144px fixed width even on narrow screens
- Question indent (38px) maintained for readability

---

## 6. CSS Reset / Base Styles

Include these in your base stylesheet:

```css
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-family-primary);
  font-size: 16px;
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: var(--color-bg-page);
}

button {
  font-family: var(--font-family-primary);
}

input, select, textarea {
  font-family: var(--font-family-primary);
}

label {
  margin: 0;
  cursor: pointer;
}

fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

legend {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}
```

---

## 7. Quick Reference: Component Usage

### When to use:
- **.question-text-inline**: For any question with a number box + stem
- **.radio-option**: Multiple choice, single answer
- **.checkbox-option**: Multiple choice, multiple answers
- **.text-answer**: Completion, fill-in, any inline text input
- **.select-answer**: Matching, classification, any dropdown
- **.constraint-text**: To indicate word limits (ONE WORD ONLY, etc)
- **.question-section**: To group related questions (e.g., Questions 1-5)
- **.option-pool-box**: For matching sections with available options
- **.table-completion**: For table-based fill-in questions
- **.flow-chart-container**: For process/sequence questions
- **.diagram-container**: For visual element labeling questions

### CSS Variable Usage:
Always prefer CSS variables over hardcoded colors:
- Text: `color: var(--color-text-primary)` or `var(--color-text-secondary)`
- Borders: `border-color: var(--color-border)` or `var(--color-border-section)`
- Backgrounds: `background-color: var(--color-bg-white)` or `var(--color-bg-page)`
- Hover states: `var(--color-primary-blue-dark)` (#1d4ed8)
- Accents: `var(--color-primary-blue)` (#2563eb)

---

## 8. Common Implementation Gotchas

### Don't:
- Use full `border` on text inputs - use `border-bottom` only (unless styling changed in spec)
- Set max-width on question section - let it flow to available width
- Change font sizes from specified values - maintain hierarchy
- Add extra margins/padding to radio options - use specified values
- Use px units for line-height in some contexts - maintain ratio consistency

### Do:
- Always use flexbox for alignment (especially option circles)
- Maintain 38px left indent for all nested content below question number
- Use `:focus-visible` for better focus management (with fallback to :focus)
- Test all interactive states (hover, focus, selected, disabled)
- Verify keyboard navigation works properly
- Check color contrast ratios meet WCAG AA standards
- Test on actual IELTS layout (ensure passage doesn't exceed readable line length)

---

## 9. Development Tips

### For Claude Implementation:
1. Start with the main container structure (.reading-test-container)
2. Build left panel (passage) first - it's mostly static content
3. Build right panel (questions) with one pattern at a time
4. Test each question pattern in isolation before combining
5. Use browser DevTools to verify spacing/dimensions match spec
6. Test keyboard navigation early - it's critical for IELTS
7. Verify all form inputs properly labeled and accessible
8. Check responsive behavior on mobile (if applicable)

### Debug Checklist:
- [ ] All CSS variables defined in :root
- [ ] Font sizes exactly match spec (18px passage, 18px question, 17px option letter)
- [ ] Line heights exactly match spec (36px passage, 27px question)
- [ ] Question indent exactly 38px (30px + 8px gap)
- [ ] Input widths exactly 144px
- [ ] Focus outlines visible and 2px solid
- [ ] Color contrast meets accessibility requirements
- [ ] Scrollbars styled consistently in both panels
- [ ] Divider cursor changes to col-resize
- [ ] All interactive states implemented (hover, focus, selected)

