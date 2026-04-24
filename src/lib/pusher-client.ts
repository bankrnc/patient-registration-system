export const CHANNEL_NAME = "patient-form";
export const EVENT_FORM_UPDATE = "form-update";
export const EVENT_STATUS_CHANGE = "status-change";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: any = null;

export function getPusherClient() {
  if (typeof window === "undefined") return null;
  if (!_instance) {
    // Dynamic require prevents SSR from loading the Node.js build
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Pusher = require("pusher-js");
    _instance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return _instance;
}
