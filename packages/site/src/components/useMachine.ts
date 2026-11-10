import { useEffect, useState } from "react";
import type { MachineEvent, MachineInstance, MachineState } from "yay-machine";

export const useMachine = <
  StateType extends MachineState,
  EventType extends MachineEvent,
>(
  machine: MachineInstance<StateType, EventType>,
) => {
  const [state, setState] = useState(machine.state);
  const [event, setEvent] = useState<EventType | undefined>();

  useEffect(() => {
    const unsubscribe = machine.subscribe(({ state, event }) => {
      setState(state);
      setEvent(event);
    });
    return () => {
      unsubscribe();
    };
  }, [machine]);

  // oxlint-disable-next-line typescript/unbound-method -- machine methods are closures and never use `this`
  return { state, event, send: machine.send };
};
