import React, {JSX} from "react";
import {StyleSheet, Text, View} from "react-native";

export interface FormatterColors {
  text: string;
  primary: string;
  muted: string;
  background: string;
}

/**
 * Enhanced guide content formatter with fixed inline bold text handling
 */
export class GuideFormatter {
  private colors: FormatterColors;

  constructor(colors: FormatterColors) {
    this.colors = colors;
  }

  /**
   * Parse and render guide content with enhanced formatting
   */
  renderContent(text: string): JSX.Element[] {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: "bullet" | "numbered" | null = null;
    let listCounter = 1;

    const flushList = (currentIndex: number) => {
      if (listItems.length > 0) {
        elements.push(
          <View key={`list-${currentIndex}`} style={styles.listContainer}>
            {listItems.map((item, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text
                  style={[styles.listMarker, { color: this.colors.primary }]}
                >
                  {listType === "numbered" ? `${idx + listCounter}.` : "•"}
                </Text>
                <Text style={[styles.listText, { color: this.colors.text }]}>
                  {this.renderInlineText(item)}
                </Text>
              </View>
            ))}
          </View>,
        );
        listItems = [];
        listType = null;
        listCounter = 1;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Handle different line types
      if (trimmedLine.startsWith("# ")) {
        flushList(index);
        elements.push(this.renderHeading1(trimmedLine.substring(2), index));
      } else if (trimmedLine.startsWith("## ")) {
        flushList(index);
        elements.push(this.renderHeading2(trimmedLine.substring(3), index));
      } else if (trimmedLine.startsWith("### ")) {
        flushList(index);
        elements.push(this.renderHeading3(trimmedLine.substring(4), index));
      } else if (trimmedLine.startsWith("#### ")) {
        flushList(index);
        elements.push(this.renderHeading4(trimmedLine.substring(5), index));
      } else if (trimmedLine.match(/^\d+\.\s/)) {
        // Numbered list
        if (listType !== "numbered") {
          flushList(index);
          listType = "numbered";
          const match = trimmedLine.match(/^(\d+)\.\s(.+)/);
          if (match) {
            listCounter = parseInt(match[1]);
          }
        }
        const match = trimmedLine.match(/^\d+\.\s(.+)/);
        if (match) {
          listItems.push(match[1]);
        }
      } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        // Bullet list
        if (listType !== "bullet") {
          flushList(index);
          listType = "bullet";
        }
        listItems.push(trimmedLine.substring(2));
      } else if (trimmedLine.startsWith("> ")) {
        flushList(index);
        elements.push(this.renderBlockquote(trimmedLine.substring(2), index));
      } else if (
        trimmedLine.startsWith("---") ||
        trimmedLine.startsWith("===")
      ) {
        flushList(index);
        elements.push(this.renderDivider(index));
      } else if (trimmedLine === "") {
        flushList(index);
        elements.push(this.renderSpacing(index));
      } else if (trimmedLine !== "") {
        flushList(index);
        elements.push(this.renderParagraph(trimmedLine, index));
      }
    });

    // Flush any remaining list items
    flushList(lines.length);

    return elements;
  }

  /**
   * Render inline text with formatting (bold, italic, code)
   * This properly handles nested text in React Native
   */
  private renderInlineText(text: string): React.ReactNode {
    // Simple approach: split by formatting markers and render each part
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
      // Look for the first occurrence of any formatting
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
      const codeMatch = remaining.match(/`([^`]+?)`/);

      // Find which comes first
      let nextMatch: {
        index: number;
        length: number;
        content: string;
        type: string;
      } | null = null;

      if (boldMatch && boldMatch.index !== undefined) {
        nextMatch = {
          index: boldMatch.index,
          length: boldMatch[0].length,
          content: boldMatch[1],
          type: "bold",
        };
      }

      if (italicMatch && italicMatch.index !== undefined) {
        const candidate = {
          index: italicMatch.index,
          length: italicMatch[0].length,
          content: italicMatch[1],
          type: "italic",
        };
        if (!nextMatch || candidate.index < nextMatch.index) {
          nextMatch = candidate;
        }
      }

      if (codeMatch && codeMatch.index !== undefined) {
        const candidate = {
          index: codeMatch.index,
          length: codeMatch[0].length,
          content: codeMatch[1],
          type: "code",
        };
        if (!nextMatch || candidate.index < nextMatch.index) {
          nextMatch = candidate;
        }
      }

      if (nextMatch) {
        // Add text before the formatting
        if (nextMatch.index > 0) {
          parts.push(remaining.substring(0, nextMatch.index));
        }

        // Add the formatted text
        if (nextMatch.type === "bold") {
          parts.push(
            <Text key={`bold-${keyIndex++}`} style={styles.bold}>
              {nextMatch.content}
            </Text>,
          );
        } else if (nextMatch.type === "italic") {
          parts.push(
            <Text key={`italic-${keyIndex++}`} style={styles.italic}>
              {nextMatch.content}
            </Text>,
          );
        } else if (nextMatch.type === "code") {
          parts.push(
            <Text
              key={`code-${keyIndex++}`}
              style={[
                styles.inlineCode,
                {
                  color: this.colors.primary,
                  backgroundColor: this.colors.background,
                },
              ]}
            >
              {nextMatch.content}
            </Text>,
          );
        }

        // Continue with the rest
        remaining = remaining.substring(nextMatch.index + nextMatch.length);
      } else {
        // No more formatting, add the rest as plain text
        if (remaining.length > 0) {
          parts.push(remaining);
        }
        break;
      }
    }

    // If no parts were created, return the original text
    return parts.length > 0 ? parts : text;
  }

  private renderHeading1(text: string, key: number): JSX.Element {
    return (
      <Text key={key} style={[styles.heading1, { color: this.colors.text }]}>
        {this.renderInlineText(text)}
      </Text>
    );
  }

  private renderHeading2(text: string, key: number): JSX.Element {
    return (
      <Text key={key} style={[styles.heading2, { color: this.colors.text }]}>
        {this.renderInlineText(text)}
      </Text>
    );
  }

  private renderHeading3(text: string, key: number): JSX.Element {
    return (
      <Text key={key} style={[styles.heading3, { color: this.colors.text }]}>
        {this.renderInlineText(text)}
      </Text>
    );
  }

  private renderHeading4(text: string, key: number): JSX.Element {
    return (
      <Text key={key} style={[styles.heading4, { color: this.colors.text }]}>
        {this.renderInlineText(text)}
      </Text>
    );
  }

  private renderParagraph(text: string, key: number): JSX.Element {
    return (
      <Text key={key} style={[styles.paragraph, { color: this.colors.text }]}>
        {this.renderInlineText(text)}
      </Text>
    );
  }

  private renderBlockquote(text: string, key: number): JSX.Element {
    return (
      <View
        key={key}
        style={[styles.blockquote, { borderLeftColor: this.colors.primary }]}
      >
        <Text style={[styles.blockquoteText, { color: this.colors.muted }]}>
          {this.renderInlineText(text)}
        </Text>
      </View>
    );
  }

  private renderDivider(key: number): JSX.Element {
    return (
      <View
        key={key}
        style={[styles.divider, { backgroundColor: this.colors.muted }]}
      />
    );
  }

  private renderSpacing(key: number): JSX.Element {
    return <View key={key} style={styles.spacing} />;
  }
}

const styles = StyleSheet.create({
  // Headings
  heading1: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 8,
  },
  heading2: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 24,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  heading4: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },

  // Text styles
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  bold: {
    fontWeight: "600",
  },
  italic: {
    fontStyle: "italic",
  },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },

  // Lists
  listContainer: {
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 16,
  },
  listMarker: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
    minWidth: 20,
  },
  listText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },

  // Special elements
  blockquote: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    marginVertical: 12,
    marginLeft: 8,
  },
  blockquoteText: {
    fontSize: 16,
    lineHeight: 22,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    marginVertical: 20,
    marginHorizontal: 20,
  },
  spacing: {
    height: 12,
  },
});
