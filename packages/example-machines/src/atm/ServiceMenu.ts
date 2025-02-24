export const ServiceMenu = {
  "Withdraw Cash": 1,
} as const;

export type Service = keyof typeof ServiceMenu;

export type ServiceId = (typeof ServiceMenu)[keyof typeof ServiceMenu];

export const getService = (serviceId: ServiceId): Service => {
  return Object.entries(ServiceMenu).find(
    ([, id]) => id === serviceId,
  )![0] as Service;
};

export const SERVICE_IDS = Object.values(ServiceMenu);
