import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";

export type ChoicePromptOption = {
  label: string;
  value: string;
  description?: string;
};

export type ChoicePromptSelection = {
  option: ChoicePromptOption;
  index: number;
};

export function ChoicePrompt({
  title,
  message,
  options,
  initialIndex = 0,
  isActive = true,
  onCancel,
  onHighlight,
  onSelect,
}: {
  title: string;
  message?: string;
  options: ChoicePromptOption[];
  initialIndex?: number;
  isActive?: boolean;
  onCancel?: () => void;
  onHighlight?: ({ option, index }: ChoicePromptSelection) => void;
  onSelect: ({ option, index }: ChoicePromptSelection) => void;
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    normalizeIndex({
      index: initialIndex,
      count: options.length,
    }),
  );

  const highlightedOption = options[highlightedIndex];

  useEffect(() => {
    setHighlightedIndex((currentIndex) =>
      normalizeIndex({
        index: currentIndex,
        count: options.length,
      }),
    );
  }, [options.length]);

  useEffect(() => {
    if (!highlightedOption) {
      return;
    }

    onHighlight?.({
      option: highlightedOption,
      index: highlightedIndex,
    });
  }, [highlightedIndex, highlightedOption, onHighlight]);

  useInput(
    (input, key) => {
      if (options.length === 0) {
        return;
      }

      if (key.upArrow || input === "k") {
        setHighlightedIndex((currentIndex) =>
          adjacentIndex({
            currentIndex,
            count: options.length,
            direction: "previous",
          }),
        );
        return;
      }

      if (key.downArrow || input === "j") {
        setHighlightedIndex((currentIndex) =>
          adjacentIndex({
            currentIndex,
            count: options.length,
            direction: "next",
          }),
        );
        return;
      }

      if (key.escape) {
        onCancel?.();
        return;
      }

      if (key.return) {
        selectHighlightedOption({
          highlightedIndex,
          highlightedOption,
          onSelect,
        });
        return;
      }

      const numberIndex = numberShortcutIndex({
        input,
        count: options.length,
      });
      if (numberIndex !== undefined) {
        const numberOption = options[numberIndex];
        if (!numberOption) {
          return;
        }

        onSelect({
          option: numberOption,
          index: numberIndex,
        });
      }
    },
    {
      isActive,
    },
  );

  const renderedOptions = useMemo(
    () =>
      options.map((option, index) => {
        const highlighted = index === highlightedIndex;

        return (
          <Text
            key={option.value}
            color={optionColor({ highlighted })}
            bold={highlighted}
            inverse={highlighted}
          >
            {optionLine({
              option,
              index,
              highlighted,
            })}
          </Text>
        );
      }),
    [highlightedIndex, options],
  );

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {title}
      </Text>
      {message && <Text dimColor>{message}</Text>}
      {options.length === 0 && <Text dimColor>No options available</Text>}
      {renderedOptions}
    </Box>
  );
}

function selectHighlightedOption({
  highlightedIndex,
  highlightedOption,
  onSelect,
}: {
  highlightedIndex: number;
  highlightedOption: ChoicePromptOption | undefined;
  onSelect: ({ option, index }: ChoicePromptSelection) => void;
}) {
  if (!highlightedOption) {
    return;
  }

  onSelect({
    option: highlightedOption,
    index: highlightedIndex,
  });
}

function adjacentIndex({
  currentIndex,
  count,
  direction,
}: {
  currentIndex: number;
  count: number;
  direction: "previous" | "next";
}): number {
  if (count <= 0) {
    return 0;
  }

  if (direction === "previous") {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      return count - 1;
    }

    return previousIndex;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex >= count) {
    return 0;
  }

  return nextIndex;
}

function normalizeIndex({
  index,
  count,
}: {
  index: number;
  count: number;
}): number {
  if (count <= 0) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= count) {
    return count - 1;
  }

  return index;
}

function numberShortcutIndex({
  input,
  count,
}: {
  input: string;
  count: number;
}): number | undefined {
  if (!/^[1-9]$/.test(input)) {
    return undefined;
  }

  const index = Number.parseInt(input, 10) - 1;
  if (index >= count) {
    return undefined;
  }

  return index;
}

function optionLine({
  option,
  index,
  highlighted,
}: {
  option: ChoicePromptOption;
  index: number;
  highlighted: boolean;
}): string {
  const marker = optionMarker({ highlighted });
  const number = index + 1;
  const suffix = descriptionSuffix({
    description: option.description,
  });

  return `${marker} ${number}. ${option.label}${suffix}`;
}

function optionMarker({ highlighted }: { highlighted: boolean }): string {
  if (highlighted) {
    return ">";
  }

  return " ";
}

function optionColor({ highlighted }: { highlighted: boolean }): "cyan" | undefined {
  if (highlighted) {
    return "cyan";
  }

  return undefined;
}

function descriptionSuffix({
  description,
}: {
  description: string | undefined;
}): string {
  if (!description) {
    return "";
  }

  return ` - ${description}`;
}
