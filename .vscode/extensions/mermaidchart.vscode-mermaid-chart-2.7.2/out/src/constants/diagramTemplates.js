"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSampleDiagrams = void 0;
const mermaidExamples = require('@mermaid-js/examples');
console.log(mermaidExamples.diagramData);
const diagramData = mermaidExamples.diagramData;
const extras = {
    ZenUML: `zenuml
  title Order Service
  @Actor Client #FFEBE6
  @Boundary OrderController #0747A6
  @EC2 <<BFF>> OrderService #E3FCEF
  group BusinessService {
    @Lambda PurchaseService
    @AzureFunction InvoiceService
  }
  @Starter(Client)
  // \`POST /orders\`
  OrderController.post(payload) {
    OrderService.create(payload) {
      order = new Order(payload)
      if(order != null) {
        par {
          PurchaseService.createPO(order)
          InvoiceService.createInvoice(order)      
        }      
      }
    }
  }
  `
};
const isValidDiagram = (diagram) => {
    return Boolean(diagram.name && diagram.examples && diagram.examples.length > 0);
};
const getSampleDiagrams = () => {
    const diagrams = diagramData
        .filter(isValidDiagram)
        .map((d) => ({
        ...d,
        example: d.examples.filter(({ isDefault }) => isDefault)[0]
    }));
    const examples = {};
    for (const diagram of diagrams) {
        if (diagram.example) {
            examples[diagram.name.replace(/ (Diagram|Chart|Graph)/, '')] = diagram.example.code;
        }
    }
    return { ...examples };
};
exports.getSampleDiagrams = getSampleDiagrams;
//# sourceMappingURL=diagramTemplates.js.map