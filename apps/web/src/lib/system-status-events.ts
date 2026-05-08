export const systemBrokerStatusUpdatedEvent =
  "openforge:system-broker-updated";

export function dispatchSystemBrokerStatusUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(systemBrokerStatusUpdatedEvent));
}
