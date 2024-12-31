interface MachineInstanceProvider<StateType extends MachineState<string>, EventType extends MachineEvent<string>> {
  newInstance(config?: MachineInstanceConfig<StateType, EventType>): MachineInstance<StateType, EventType>;
}

type MachineStateFactories<StateType extends MachineState<string>> = {
  [Name in StateType["name"]]: StateContext<StateType, Name> extends never
    ? () => ExtractState<StateType, Name>
    : (context: StateContext<StateType, Name>) => ExtractState<StateType, Name>;
};

type MachineEventFactories<EventType extends MachineEvent<string>> = {
  [Type in EventType["type"]]: EventPayload<EventType, Type> extends never
    ? () => ExtractEvent<EventType, Type>
    : (payload: EventPayload<EventType, Type>) => ExtractEvent<EventType, Type>;
};

type MachineDefinition<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
> = MachineInstanceProvider<StateType, EventType> & MachineStateFactories<StateType> & MachineEventFactories<EventType>;

interface MachineInstanceConfig<StateType extends MachineState<string>, EventType extends MachineEvent<string>> {
  readonly initialState?: StateType;
}

interface MachineInstance<StateType extends MachineState<string>, EventType extends MachineEvent<string>> {
  readonly currentState: StateType;
  start(): void;
  stop(): void;
  send(event: EventType): void;
  subscribe(callback: (state: StateType, event: EventType | undefined) => void): Unsubscribe;
}

type Unsubscribe = () => void;

interface MachineEvent<Type extends string> {
  readonly type: Type;
}

type ExtractEvent<EventType extends MachineEvent<string>, Type extends EventType["type"]> = Extract<
  EventType,
  { type: Type }
>;

type EventPayload<EventType extends MachineEvent<string>, Type extends EventType["type"]> = keyof Omit<
  ExtractEvent<EventType, Type>,
  "name"
> extends never
  ? never
  : Omit<ExtractEvent<EventType, Type>, "name">;

interface MachineState<Name extends string> {
  readonly name: Name;
}

type ExtractState<StateType extends MachineState<string>, Name extends StateType["name"]> = Extract<
  StateType,
  { name: Name }
>;

type StateContext<StateType extends MachineState<string>, Name extends StateType["name"]> = keyof Omit<
  ExtractState<StateType, Name>,
  "name"
> extends never
  ? never
  : Omit<ExtractState<StateType, Name>, "name">;

type MachineDefinitionConfig<StateType extends MachineState<string>, EventType extends MachineEvent<string>> = {
  readonly initialState: StateType;
  readonly states: Partial<MachineStatesConfig<StateType, EventType>>;
  readonly onStart?: InvokeFunction<StateType, EventType, StateType>;
  readonly onStop?: InvokeFunction<StateType, EventType, StateType>;
  readonly on?: Partial<MachineStateTransitions<StateType, EventType, StateType>>;
};

type MachineStatesConfig<StateType extends MachineState<string>, EventType extends MachineEvent<string>> = {
  readonly [Name in StateType["name"]]: MachineStateConfig<StateType, EventType, ExtractState<StateType, Name>>;
};

type MachineStateConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = {
  readonly on?: Partial<MachineStateTransitions<StateType, EventType, CurrentState>>;
  readonly always?: OneOrMore<MachineStateTransition<StateType, EventType, CurrentState, undefined>>;
  readonly onEntry?: InvokeFunction<StateType, EventType, CurrentState>;
  readonly onExit?: InvokeFunction<StateType, EventType, CurrentState>;
};

type MachineStateTransitions<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    MachineStateTransition<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>>
  >;
};

type MachineStateTransition<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  [Name in StateType["name"]]: keyof Omit<ExtractState<StateType, Name>, "name"> extends never
    ? TransitionTo<StateType, EventType, Name, CurrentState, CurrentEvent>
    : TransitionTo<StateType, EventType, Name, CurrentState, CurrentEvent> &
        TransitionWith<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>;
}[StateType["name"]];

type OneOrMore<Transition> = Transition | readonly Transition[];

type TransitionTo<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  Name extends StateType["name"],
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  readonly to: Name;
  readonly when?: (currentState: CurrentState, currentEvent: CurrentEvent) => boolean;
  readonly onTransition?: InvokeFunction<StateType, EventType, CurrentState>;
};

type TransitionWith<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = {
  readonly with: WithFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
};

type WithFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = (currentState: CurrentState, event: CurrentEvent) => StateContext<NextState, NextState["name"]>;

type InvokeFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = (
  machine: Omit<MachineInstance<StateType, EventType>, "currentState"> & { readonly currentState: CurrentState },
  // biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
) => Unsubscribe | undefined | null | void;

export const defineMachine = <StateType extends MachineState<string>, EventType extends MachineEvent<string>>(
  config: MachineDefinitionConfig<StateType, EventType>,
): MachineDefinition<StateType, EventType> => {
  // @ts-expect-error
  return {
    newInstance() {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return {} as any;
    },
  };
};

interface OffState {
  readonly name: "off";
}

interface OnState {
  readonly name: "on";
}

interface OffEvent {
  readonly type: "OFF";
}

interface OnEvent {
  readonly type: "ON";
}

const lightMachine = defineMachine<OffState | OnState, OffEvent | OnEvent>({
  initialState: { name: "off" },
  states: {
    off: {
      on: {
        ON: { to: "on" },
      },
    },
    on: {
      on: {
        OFF: { to: "off" },
      },
    },
  },
});

interface IdleState {
  readonly name: "idle";
}

interface ActiveState {
  readonly time: number;
  readonly repeat: boolean;
}

interface RunningState extends ActiveState {
  readonly name: "running";
}

interface FiredState extends ActiveState {
  readonly name: "fired";
}

interface RunEvent {
  readonly type: "RUN";
  readonly time: number;
  readonly repeat?: boolean;
}

interface FiredEvent {
  readonly type: "FIRED";
}

interface CancelEvent {
  readonly type: "CANCEL";
}

const timerMachine = defineMachine<IdleState | RunningState | FiredState, RunEvent | FiredEvent | CancelEvent>({
  initialState: { name: "idle" },
  states: {
    idle: {
      on: {
        RUN: { to: "running", with: (_, { time, repeat }) => ({ time, repeat: repeat === true }) },
      },
    },
    running: {
      onEntry: (machine) => {
        const timer = setTimeout(() => machine.send({ type: "FIRED" }), machine.currentState.time);
        return () => clearTimeout(timer);
      },
      on: {
        FIRED: { to: "fired", with: ({ time, repeat }) => ({ time, repeat }) },
        CANCEL: { to: "idle" },
      },
    },
    fired: {
      always: [
        { to: "idle", when: ({ repeat }) => !repeat },
        { to: "running", with: ({ time, repeat }) => ({ time, repeat }) },
      ],
    },
  },
});
