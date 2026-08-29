import { Injectable } from "@nestjs/common";
import { GENERATIVE_MODELS_CATALOG, type GenerativeModel } from "@lcs/shared";

@Injectable()
export class ModelCatalogService {
  getCatalog(): GenerativeModel[] {
    return GENERATIVE_MODELS_CATALOG;
  }

  getModelById(id: string): GenerativeModel | undefined {
    return GENERATIVE_MODELS_CATALOG.find((m) => m.id === id);
  }

  getModelsByModality(modality: string): GenerativeModel[] {
    return GENERATIVE_MODELS_CATALOG.filter((m) => m.modality === modality);
  }
}
