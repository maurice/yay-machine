import { type FC, memo } from "react";
import type {
  Align,
  Direction,
  Ranker,
  YmChart,
  YmState,
  YmTransition,
} from "../ym";
import "../ym";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "my-chart": React.HTMLAttributes<YmChart>;
      "my-state": React.HTMLAttributes<YmState>;
      "my-transition": React.HTMLAttributes<YmTransition>;
    }
  }
}

interface State {
  readonly name: string;
}
interface Transition {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
}

interface Props {
  readonly className?: string;
  readonly states?: readonly (State | string)[];
  readonly transitions?: readonly Transition[];
  readonly start?: string;
  readonly end?: readonly string[];
  readonly current?: string;
  readonly data?: object;
  readonly direction?: Direction;
  readonly align?: Align;
  readonly ranker?: Ranker;
  readonly compact?: boolean;
}

export const StateChart: FC<Props> = memo(
  ({
    className = "",
    current,
    data,
    start,
    end,
    states,
    transitions,
    direction,
    align,
    ranker,
    compact,
  }) => {
    const classNames = `${className ?? ""} no-content`;
    return (
      // @ts-ignore
      <ym-chart
        class={classNames}
        start={start}
        end={end}
        current={current}
        data={data}
        direction={direction}
        align={align}
        ranker={ranker}
      >
        {states?.map((it: string | State) => (
          // @ts-ignore
          <ym-state
            key={typeof it === "string" ? it : it.name}
            name={typeof it === "string" ? it : it.name}
            compact={compact}
          />
        ))}
        {transitions?.map((it: Transition) => (
          // @ts-ignore
          <ym-transition
            key={`${it.from}${it.to}${it.label}`}
            from={it.from}
            to={it.to}
            label={it.label}
            compact={compact}
          />
        ))}
        {/* @ts-ignore */}
      </ym-chart>
    );
  },
);
