import type { ReactNode } from "react";
import { ButtonGroup, GroupButton } from "./ButtonGroup";
import { Control } from "./Control";

export interface Option<T> {
  readonly value: T;
  readonly label: ReactNode;
  readonly title?: string;
}

interface ChoiceProps<T> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
}

/** A row of buttons where exactly one is pressed. */
export const Choice = <T extends string | number>({
  label,
  value,
  options,
  onChange,
}: ChoiceProps<T>) => (
  <Control label={label}>
    <ButtonGroup>
      {options.map((option) => (
        <GroupButton
          key={option.value}
          pressed={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </GroupButton>
      ))}
    </ButtonGroup>
  </Control>
);
