type UnauthorizedHandler = () => Promise<boolean> | boolean;

class AuthEventBus {
  private target = new EventTarget();
  private isHandlingUnauthorized = false;

  onUnauthorized(handler: UnauthorizedHandler) {
    const controller = new AbortController();
    const wrapped = async () => {
      const result = await handler();
      if (result) {
        this.isHandlingUnauthorized = false;
      }
    };

    this.target.addEventListener("unauthorized", wrapped, {
      signal: controller.signal,
    });
    return () => controller.abort();
  }

  emitUnauthorized() {
    if (this.isHandlingUnauthorized) {
      return;
    }
    this.isHandlingUnauthorized = true;
    this.target.dispatchEvent(new Event("unauthorized"));
  }

  resetUnauthorizedState() {
    this.isHandlingUnauthorized = false;
  }
}

export const authEvents = new AuthEventBus();
