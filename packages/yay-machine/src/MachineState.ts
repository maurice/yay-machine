export interface MachineState<Name extends string> {
  readonly name: Name;
}

export type ExtractState<StateType extends MachineState<string>, Name extends StateType["name"]> = Extract<
  StateType,
  { name: Name }
>;

export type StateContext<StateType extends MachineState<string>, Name extends StateType["name"]> = keyof Omit<
  ExtractState<StateType, Name>,
  "name"
> extends never
  ? never
  : Omit<ExtractState<StateType, Name>, "name">;
