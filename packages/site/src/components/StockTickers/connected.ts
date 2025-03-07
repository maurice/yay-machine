import { switchMachine } from "@yay-machine/example-machines";
import { useCallback, useEffect, useState } from "react";

export const connected = switchMachine.newInstance().start();

export const useConnected = () => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    return connected.subscribe(({ state }) => setOn(state.name === "on"));
  });
  const set = useCallback((on: boolean) => {
    connected.send({ type: on ? "ON" : "OFF" });
  }, []);
  return [on, set] as const;
};
