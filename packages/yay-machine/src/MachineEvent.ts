/**
 * The base interface for all machine events.
 * User-defined events do not need to extend this interface, just conform to its shape,
 * and can also have their own arbitrary properties.
 */
export interface MachineEvent<Type extends string = string> {
  readonly type: Type;
}

/**
 * Extracts the specific event type from a union of events.
 */
export type ExtractEvent<EventType extends MachineEvent, Type extends EventType["type"]> = Extract<
  EventType,
  { type: Type }
> extends never
  ? ExtractComplexEvent<EventType, Type>
  : Extract<EventType, { type: Type }>;

type ExtractComplexEvent<EventType extends MachineEvent, Type extends EventType["type"]> = EventType extends {
  type: infer N;
}
  ? Type extends N
    ? EventType /* & { type: Type } */
    : never
  : never;

/**
 * Extracts the "payload" (ie, everything but the `type` field) of a specific event type.
 */
export type EventPayload<
  EventType extends MachineEvent,
  Type extends EventType["type"] = EventType["type"],
> = keyof Omit<ExtractEvent<EventType, Type>, "type"> extends never
  ? never
  : Omit<ExtractEvent<EventType, Type>, "type">;
