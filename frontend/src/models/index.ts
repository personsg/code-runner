import { Models } from "@rematch/core";
import { appState } from "./appState";

export interface RootModel extends Models<RootModel> {
  appState: typeof appState;
}

export const models: RootModel = { appState };
