export interface MachineState<Name extends string> {
  readonly name: Name;
}

export type ExtractState<StateType extends MachineState<string>, Name extends StateType["name"]> = Extract<
  StateType,
  { name: Name }
> extends never
  ? ExtractComplexState<StateType, Name>
  : Extract<StateType, { name: Name }>;

type ExtractComplexState<StateType extends MachineState<string>, Name extends StateType["name"]> = StateType extends {
  name: infer N;
}
  ? Name extends N
    ? StateType /* & { name: Name } */
    : never
  : never;

export type StateData<StateType extends MachineState<string>, Name extends StateType["name"]> = keyof Omit<
  ExtractState<StateType, Name>,
  "name"
> extends never
  ? never
  : Omit<ExtractState<StateType, Name>, "name">;

type ExpandStateDataTypes<StateType extends MachineState<string>> = {
  [Name in StateType["name"]]: StateData<StateType, Name>;
};

type Values<T> = T[keyof T];

type AllValuesCompatible<T> = Values<T> extends infer V
  ? { [K in keyof T]: V extends T[K] ? true : false }[keyof T] extends true
    ? true
    : false
  : false;

export type IsStateDataHomogenous<StateType extends MachineState<string>> = AllValuesCompatible<
  ExpandStateDataTypes<StateType>
>;
