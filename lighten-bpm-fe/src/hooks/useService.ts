import { container } from "../container";

export function useService<T>(serviceIdentifier: symbol): T {
  return container.get<T>(serviceIdentifier);
}
