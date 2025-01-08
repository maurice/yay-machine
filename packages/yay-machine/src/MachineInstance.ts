import type { MachineEvent } from "./MachineEvent";
import type { MachineState } from "./MachineState";

/**
 * Configuration for a new machine instance
 */
export interface MachineInstanceConfig<StateType extends MachineState> {
  /**
   * The initial state of the machine instance.
   * This overrides the default initial state in the machine definition.
   */
  readonly initialState?: StateType;
}

export interface MachineInstance<StateType extends MachineState, EventType extends MachineEvent> {
  /**
   * Getter returning the current state of the machine
   */
  readonly state: StateType;

  /**
   * Start the machine.
   * This will:
   * * run the machine's optional `onStart()` side-effect
   * * enters the initial state and runs its optional `onEnter()` side-effect
   * * run any immediate transitions for the initial state
   * @returns the machine instance
   * @throws error if already running
   */
  start(): this;

  /**
   * Stops a running machine.
   * This will:
   * * run the current state's optional `onEnter()` side-effect's tear-down function
   * * run the current state's option `onExit()` side-effect
   * * run the machine's optional `onStart()` side-effect's tear-down function
   * * run the machine's optional `onStop()` side-effect
   * @throws error if not already running
   */
  stop(): void;

  /**
   * Send an event to the machine.
   * The event may trigger zero or more state-transitions
   * @param event the event to send
   * @throws error if not already running
   */
  send(event: EventType): void;

  /**
   * Add a subscriber, to be notified whenever the machine state changes
   * @param subscriber callback function which is called with the initial state, then every time it changes
   * @returns a function to remove the subscriber
   */
  subscribe(subscriber: Subscriber<StateType, EventType>): Unsubscribe;
}

/**
 * Subscriber callback function type
 * @param params the machine's current state and optional event that triggered the last state-change
 */
export type Subscriber<StateType extends MachineState, EventType extends MachineEvent> = (
  params: SubscriberParams<StateType, EventType>,
) => void;

/**
 * Subscriber callback params type
 * @property state the machine's current state
 * @property event the event that triggered the most recent state-change, if any
 */
export interface SubscriberParams<StateType extends MachineState, EventType extends MachineEvent> {
  readonly state: StateType;
  readonly event: EventType | undefined;
}

export type Unsubscribe = () => void;
