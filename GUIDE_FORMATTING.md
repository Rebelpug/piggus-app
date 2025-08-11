# Guide Formatting Instructions

This document provides instructions for formatting guide content in the Piggus app using the enhanced GuideFormatter.

## Available Formatting Options

### 1. Headings

Use `#` symbols to create different heading levels:

```
# Main Heading (H1)
## Section Heading (H2)
### Subsection Heading (H3)
#### Minor Heading (H4)
```

**Result:**

- H1: Large, bold heading (28px)
- H2: Medium heading with top margin (22px)
- H3: Smaller heading (18px)
- H4: Smallest heading (16px)

### 2. Text Formatting

#### Bold Text

Use double asterisks for bold text:

```
**This text will be bold**
```

You can also use bold text inline within paragraphs:

```
This is a paragraph with **bold text** in the middle.
```

#### Italic Text

Use single asterisks for italic text:

```
*This text will be italic*
```

#### Inline Code

Use backticks for inline code:

```
Use the `useState` hook for state management.
```

### 3. Lists

#### Bullet Lists

Use `-` or `*` for bullet points:

```
- First item
- Second item
- Third item
```

#### Numbered Lists

Use numbers with dots:

```
1. First step
2. Second step
3. Third step
```

**Note:** Numbers will be automatically formatted, so you can use any number:

```
1. First step
1. Second step
1. Third step
```

### 4. Special Elements

#### Blockquotes

Use `>` for highlighted quotes or important notes:

```
> This is an important note or tip that stands out from regular text.
```

#### Dividers

Use three dashes or equals signs for section dividers:

```
---
```

or

```
===
```

### 5. Spacing

#### Paragraphs

Separate paragraphs with empty lines:

```
This is the first paragraph.

This is the second paragraph.
```

#### Line Breaks

Use empty lines to add spacing between elements.

## Complete Example

Here's a complete example showing all formatting options:

```
# Financial Planning Guide

Welcome to our comprehensive financial planning guide.

## Getting Started

**First things first:** let's understand the basics.

### Essential Steps

Before you begin, make sure you have:

1. A clear understanding of your income
2. Knowledge of your monthly expenses
3. Access to your bank statements

### Key Concepts

- *Emergency Fund*: 3-6 months of expenses
- *Budgeting*: Tracking income vs expenses
- *Investment*: Growing money over time

> Remember: Financial planning is a marathon, not a sprint!

---

#### Quick Tips

Use the `50/30/20` rule:
- **50%** for needs
- **30%** for wants
- **20%** for savings and debt repayment

This approach helps maintain a balanced financial life.

## Advanced Topics

More complex topics will be covered in separate guides.
```

## Best Practices

1. **Use clear headings** to structure your content
2. **Break up long text** with bullet points or numbered lists
3. **Highlight important information** with bold text or blockquotes
4. **Use consistent formatting** throughout the guide
5. **Add spacing** between sections for better readability

## Technical Notes

- The formatter automatically handles text colors based on the app's theme
- Lists are automatically grouped and formatted
- Inline formatting can be combined (e.g., **bold `code`**)
- Empty lines create consistent spacing throughout the guide

## File Location

The formatter is implemented in `/utils/guideFormatter.ts` and used in the guide detail screen at `/app/(protected)/guide-detail.tsx`.
