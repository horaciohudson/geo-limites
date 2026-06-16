export interface TemplateIndex {
  id: string;
  name: string;
  file: string;
}

export const templateIndex: TemplateIndex[] = [
  {
    id: "memorial_descritivo",
    name: "Memorial Descritivo",
    file: "memorial_descritivo.json"
  },
  {
    id: "relatorio_geometrico", 
    name: "Relatório Geométrico",
    file: "relatorio_geometrico.json"
  },
  {
    id: "cadastro_terreno",
    name: "Cadastro de Terreno", 
    file: "cadastro_terreno.json"
  },

    {
    id: "desmembramento_terreno",
    name: "Desmembramento de Terreno", 
    file: "memorial_desmembramento.json"
  }

];

export default templateIndex;