/**
 * The base interface for all machine events.
 * User-defined events do not need to extend this interface, just conform to its shape,
 * and can also have their own arbitrary properties.
 */
export interface MachineEvent<Type extends string> {
  readonly type: Type;
}

/**
 * Extracts the specific event type from a union of events.
 */
export type ExtractEvent<EventType extends MachineEvent<string>, Type extends EventType["type"]> = Extract<
  EventType,
  { type: Type }
>;

/**
 * Extracts the "payload" (ie, everything but the `type` field) of a specific event type.
 */
export type EventPayload<EventType extends MachineEvent<string>, Type extends EventType["type"]> = keyof Omit<
  ExtractEvent<EventType, Type>,
  "type"
> extends never
  ? never
  : Omit<ExtractEvent<EventType, Type>, "type">;
