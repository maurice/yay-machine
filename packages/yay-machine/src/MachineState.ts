export interface MachineState<Name extends string> {
  readonly name: Name;
}

export type ExtractState<StateType extends MachineState<string>, Name extends StateType["name"]> = Extract<
  StateType,
  { name: Name }
> extends never
  ? ExtractComplexEventState<StateType, Name>
  : Extract<StateType, { name: Name }>;

type ExtractComplexEventState<
  StateType extends MachineState<string>,
  Name extends StateType["name"],
> = StateType extends { name: infer N } ? (Name extends N ? StateType /* & { name: Name } */ : never) : never;

export type StateData<StateType extends MachineState<string>, Name extends StateType["name"]> = keyof Omit<
  ExtractState<StateType, Name>,
  "name"
> extends never
  ? never
  : Omit<ExtractState<StateType, Name>, "name">;
