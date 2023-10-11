import { createModel } from "@rematch/core";
import { RootModel } from ".";

type AppState = {
  experiments: string[]
}

export const appState = createModel<RootModel>()({
  state: {
    experiments: [],
  } as AppState,
  reducers: {
    enableExperiment(state, experiment: string) {
      return {
        ...state,
        experiments: [...state.experiments, experiment],
      };
    },
    disableExperiment(state, experiment: string) {
      return {
        ...state,
        experiments: state.experiments.filter((e) => e !== experiment),
      };
    }
  },
  effects: (dispatch) => ({

  }),
});
