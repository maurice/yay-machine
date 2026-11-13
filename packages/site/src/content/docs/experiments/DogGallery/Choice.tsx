import type { ReactNode } from "react";

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
  <fieldset className="dog-gallery__control">
    <legend>{label}</legend>
    <div className="dog-gallery__buttons">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  </fieldset>
);
