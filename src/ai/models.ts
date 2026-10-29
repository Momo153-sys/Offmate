import { prebuiltAppConfig } from '@mlc-ai/web-llm';

export const availableModels = prebuiltAppConfig.model_list.map(
  (model) => ({
    id: model.model_id,
    library: model.model_lib,
  }),
);