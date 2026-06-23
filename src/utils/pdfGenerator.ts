import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Obra, WeeklyReport } from "../types";
// @ts-ignore
import quantaLogo from "../assets/images/quanta_logo_1781628241816.jpg";
// @ts-ignore
import quantaBackground from "../assets/images/quanta_background_1781614926431.jpg";

// Helper to format currency in pt-BR
function formatCurrency(val: number): string {
  return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getImageFormat(dataUrl: string): "PNG" | "JPEG" {
  if (!dataUrl) return "JPEG";
  if (dataUrl.includes("image/png") || dataUrl.includes(".png") || dataUrl.startsWith("data:image/png") || dataUrl.includes("image/svg+xml") || dataUrl.includes(".svg") || dataUrl.startsWith("data:image/svg+xml")) return "PNG";
  return "JPEG";
}

// Convert image URL to Base64 (promises fallback to placeholder on fail)
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { referrerPolicy: "no-referrer" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null; // Silent catch, draw neat placeholder instead
  }
}

// Get image natural dimensions for accurate scaling
function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = base64;
  });
}

export async function generateWeeklyPDF(selectedObra: Obra, selectedReport: WeeklyReport): Promise<any> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Load the "timbrado" (letterhead background image) prioritizing localStorage, then /timbrado.png, then fallback
  let bgImgData = localStorage.getItem("pdfTimbradoImage");
  if (bgImgData && (bgImgData.startsWith("http") || bgImgData.startsWith("/"))) {
    const fetched = await getBase64ImageFromUrl(bgImgData);
    if (fetched) bgImgData = fetched;
  }
  if (!bgImgData || !bgImgData.startsWith("data:image")) {
    bgImgData = await getBase64ImageFromUrl("/timbrado.png");
  }
  if (!bgImgData || !bgImgData.startsWith("data:image")) {
    bgImgData = await getBase64ImageFromUrl(quantaBackground);
  }

  // Hook into jsPDF's addPage to automatically draw the background on every new page FIRST
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function(...args: any[]) {
    originalAddPage(...args);
    if (bgImgData) {
      doc.addImage(bgImgData, getImageFormat(bgImgData), 0, 0, 210, 297, undefined, "NONE");
    }
    return this;
  }

  // Draw background manually on the very first page
  if (bgImgData) {
    doc.addImage(bgImgData, getImageFormat(bgImgData), 0, 0, 210, 297, undefined, "NONE");
  }

  const primaryColor = [228, 161, 123]; // Quanta soft orange (#E4A17B)
  const darkTextColor = [30, 30, 30];
  const borderLight = [200, 200, 200];

  // Optional CAPA / Cover (with fallback to /cover.jpg)
  let capaImgData = localStorage.getItem("pdfCapaImage");
  if (capaImgData && (capaImgData.startsWith("http") || capaImgData.startsWith("/"))) {
    const fetched = await getBase64ImageFromUrl(capaImgData);
    if (fetched) capaImgData = fetched;
  }
  if (!capaImgData || !capaImgData.startsWith("data:image")) {
    capaImgData = await getBase64ImageFromUrl("/cover.jpg");
  }
  if (capaImgData && capaImgData.startsWith("data:image")) {
    // Draw the custom cover image filling the A4 page
    doc.addImage(capaImgData, getImageFormat(capaImgData), 0, 0, 210, 297, undefined, "NONE");
    
    // Draw watermark (timbrado.png) on top of the cover image, but under text
    if (bgImgData) {
      doc.addImage(bgImgData, getImageFormat(bgImgData), 0, 0, 210, 297, undefined, "NONE");
    }
    
    // Add overlay text
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(28);
    // We use a dark color assuming the cover usually has a bright spot, or standard styling
    doc.setTextColor(30, 30, 30);
    const titleLines = doc.splitTextToSize("RELATÓRIO SEMANAL DE\nGERENCIAMENTO E FISCALIZAÇÃO\nTÉCNICA DE OBRAS", 170);
    const titleY = 165;
    doc.text(titleLines, 20, titleY);

    const titleHeight = titleLines.length * 12; // approximate line height
    const dateY = titleY + titleHeight + 5;

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    const dataRangeStr = `${selectedReport.periodoInicio.split("-").reverse().join(".")} a ${selectedReport.periodoFim.split("-").reverse().join(".")}`;
    doc.text(dataRangeStr, 20, dateY);

    const contractY = dateY + 10;
    doc.setFontSize(12);
    doc.setTextColor(228, 100, 30); // elegant orange
    doc.text(`TERMO DE CONTRATO N° ${selectedObra.contratoNo}`, 20, contractY);

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const descParagraph = "Empresa especializada em engenharia para realização de serviços técnicos de Assessoramento, Gerenciamento, Supervisão, Fiscalização Técnica e Controle Tecnológico das obras que serão desenvolvidas no município de Maricá/RJ, no âmbito da CODEMAR.";
    doc.text(descParagraph, 20, contractY + 10, { maxWidth: 170, align: "justify" });

    // Proceed to next page for the content
    doc.addPage();
  }

  // CONTENT PAGE 1: CONTRACT SUMMARY SHEET
  
  // Header banner for page 1 (Moved up by 1 cm -> Y starts at 20)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, 20, 190, 9.8, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  
  // Render complete, non-truncated name of work
  const obraTitleLines = doc.splitTextToSize(selectedObra.titulo, 184);
  if (obraTitleLines.length === 1) {
    doc.text(obraTitleLines[0], 13, 26.5);
  } else {
    doc.text(obraTitleLines.slice(0, 2), 13, 24);
  }

  let tableStartY = 35;

  // Render cover photo space between header banner and data table
  if (selectedReport.fotoCapa && selectedReport.fotoCapa.startsWith("data:image")) {
    doc.setFillColor(245, 245, 245);
    doc.rect(10, 35, 190, 71.25, "F");
    try {
      const imgProps = doc.getImageProperties(selectedReport.fotoCapa);
      const maxW = 190;
      const maxH = 71.25;
      let drawW = maxW;
      let drawH = (imgProps.height * maxW) / imgProps.width;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = (imgProps.width * maxH) / imgProps.height;
      }
      const drawX = 10 + (maxW - drawW) / 2;
      const drawY = 35 + (maxH - drawH) / 2;
      doc.addImage(selectedReport.fotoCapa, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");
    } catch (e) {
      console.error("Erro ao desenhar foto de capa:", e);
      // Fallback
      doc.addImage(selectedReport.fotoCapa, "JPEG", 10, 35, 190, 71.25, undefined, "FAST");
    }
    tableStartY = 109.5;
  } else {
    // If no cover photo provided, we can either render a placeholder or just collapse.
    // We render a small light gray placeholder with instructions
    doc.setFillColor(245, 245, 245);
    doc.rect(10, 35, 190, 71.25, "F");
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Espaço reservado para foto de capa da obra.", 105, 70.6, { align: "center" });
    tableStartY = 109.5;
  }

  // Build grid table of contract values
  const tableData = [
    [
      { content: `Contrato Nº: ${selectedObra.contratoNo}`, colSpan: 2 },
      { content: `Concorrência: ${selectedObra.concorrenciaPublicaNo}`, colSpan: 2 }
    ],
    [
      { content: `Processo Adm: ${selectedObra.processoAdministrativoNo}`, colSpan: 2 },
      { content: `Data de Assinatura: ${selectedObra.dataAssinatura}`, colSpan: 2 }
    ],
    [
      { content: `Publicação JOM: ${selectedObra.dataPublicacaoJOM || "Pendente"}`, colSpan: 2 },
      { content: `Data Ordem Início: ${selectedObra.dataOrdemInicio}`, colSpan: 2 }
    ],
    [
      { content: `Empresa Vencedora: ${selectedObra.empresaVencedora}`, colSpan: 4 }
    ],
    [
      { content: `Prazo Vigência Inicial: ${selectedObra.prazoVigenciaInicial}`, colSpan: 2 },
      { content: `Prazo Execução Inicial: ${selectedObra.prazoExecucaoInicial}`, colSpan: 2 }
    ],
    [
      { content: `Previsão Início: ${selectedObra.dataInicio}`, colSpan: 2 },
      { content: `Valor Contratual Inicial: ${formatCurrency(selectedObra.valorContratualInicial)}`, colSpan: 2 }
    ],
    [
      { content: `Valor Atualizado: ${formatCurrency(selectedObra.valorContratualAtual)}`, colSpan: 4 }
    ]
  ];

  // If work has aditivos, list them out beautifully matching requirements
  if (selectedObra.aditivos && selectedObra.aditivos.length > 0) {
    selectedObra.aditivos.forEach((ad) => {
      tableData.push([
        { 
          content: `${ad.numero}º TERMO ADITIVO CONTRATUAL`, 
          colSpan: 4, 
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] } 
        } as any
      ]);
      
      const prazoAditivado = ad.prazoAditivadoMeses ? `${ad.prazoAditivadoMeses} meses` : "Nenhum";
      const valorAditivado = ad.valorAditivado ? formatCurrency(ad.valorAditivado) : "Nenhum";
      
      const novoPrazoConsolidado = ad.novoPrazoContratual || "N/A";
      const novoValorConsolidado = ad.novoValorContratual || formatCurrency(selectedObra.valorContratualAtual);
      
      tableData.push([
        { content: `• Data de Assinatura: ${ad.dataAssinatura || "N/A"}`, colSpan: 2 },
        { content: `• Data de publicação no JOM: ${ad.dataPublicacaoJOM || "N/A"}`, colSpan: 2 }
      ]);

      if (ad.tipo === "prazo") {
        // Only prazo: remove "Valor Aditivado" and "Novo Valor Contratual"
        tableData.push([
          { content: `• Prazo Aditivado: ${prazoAditivado}`, colSpan: 4 }
        ]);
        tableData.push([
          { content: `• Novo Prazo de Execução: ${ad.novoPrazoExecucao || novoPrazoConsolidado}`, colSpan: 4 }
        ]);
        tableData.push([
          { content: `• Novo Prazo de Vigência de Contrato: ${novoPrazoConsolidado}`, colSpan: 4 }
        ]);
      } else if (ad.tipo === "financeiro") {
        // Only financial: remove "Novo Prazo de Execução" and "Novo Prazo de Vigência de Contrato"
        tableData.push([
          { content: `• Prazo Aditivado: ${prazoAditivado}`, colSpan: 2 },
          { content: `• Valor Aditivado: ${valorAditivado}`, colSpan: 2 }
        ]);
        tableData.push([
          { content: `• Novo Valor Contratual: ${novoValorConsolidado}`, colSpan: 4 }
        ]);
      } else {
        // Both (ambos) or default: keep all fields
        tableData.push([
          { content: `• Prazo Aditivado: ${prazoAditivado}`, colSpan: 2 },
          { content: `• Valor Aditivado: ${valorAditivado}`, colSpan: 2 }
        ]);
        tableData.push([
          { content: `• Novo Prazo de Execução: ${ad.novoPrazoExecucao || novoPrazoConsolidado}`, colSpan: 2 },
          { content: `• Novo Valor Contratual: ${novoValorConsolidado}`, colSpan: 2 }
        ]);
        tableData.push([
          { content: `• Novo Prazo de Vigência de Contrato: ${novoPrazoConsolidado}`, colSpan: 4 }
        ]);
      }
    });
  }

  // Draw the autoTable
  autoTable(doc, {
    startY: tableStartY,
    body: tableData as any,
    theme: "plain",
    tableWidth: 190,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 8,
      textColor: darkTextColor as any,
      lineWidth: 0.1,
      lineColor: borderLight as any,
      cellPadding: { top: 1.54, bottom: 1.54, left: 2, right: 2 }
    },
    columnStyles: {
      0: { cellWidth: 47.5 },
      1: { cellWidth: 47.5 },
      2: { cellWidth: 47.5 },
      3: { cellWidth: 47.5 }
    }
  });

  // PAGE 3: CRONOLOGIA DE OBRA (VISUAL TIMELINE AND/OR CUSTOM IMAGE)
  doc.addPage();
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // black As requested
  doc.text("CRONOLOGIA DE OBRA", 105, 28, { align: "center" });
  
  if (selectedObra.imagemCronologia) {
    let cronoImg = selectedObra.imagemCronologia;
    if (cronoImg && (cronoImg.startsWith("http") || cronoImg.startsWith("/"))) {
      const fetched = await getBase64ImageFromUrl(cronoImg);
      if (fetched) cronoImg = fetched;
    }
    // Render custom base64 image of the cronologia with accurate original aspect ratio
    let imgWidth = 180;
    let imgHeight = 135;
    try {
      const dims = await getImageDimensions(cronoImg);
      if (dims.width > 0 && dims.height > 0) {
        const maxWidth = 180;
        const maxHeight = 240;
        const ratio = dims.width / dims.height;
        
        // Fit within 180mm width
        imgWidth = maxWidth;
        imgHeight = maxWidth / ratio;
        
        // If height exceeds max allowed (240mm), fit height instead
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = maxHeight * ratio;
        }
      }
    } catch (e) {
      // Use fallback dimensions
    }

    const xPos = 15 + (180 - imgWidth) / 2; // Center horizontally
    const yPos = 38; // Top-aligned started right below header

    try {
      doc.addImage(cronoImg, getImageFormat(cronoImg), xPos, yPos, imgWidth, imgHeight, undefined, "NONE");
    } catch {
      try {
        const altFormat = getImageFormat(cronoImg) === "PNG" ? "JPEG" : "PNG";
        doc.addImage(cronoImg, altFormat, xPos, yPos, imgWidth, imgHeight, undefined, "NONE");
      } catch (err) {
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(10);
         doc.setTextColor(150, 150, 150);
        doc.text("Não foi possível renderizar a imagem da cronologia. Formato não suportado.", 20, 45);
      }
    }
  } else {
    // Render Project milestone timeline using vector lines as fallback
    const timelineStartY = 45;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1.5);
    doc.line(35, timelineStartY, 35, 250); // Vertical central axis

    // Anchor dot 1: Contract signed
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(35, timelineStartY + 10, 3, "FD");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(selectedObra.dataAssinatura, 42, timelineStartY + 10);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Assinatura do Contrato de Execução Inicial", 42, timelineStartY + 15);
    doc.text(`Valor Original: ${formatCurrency(selectedObra.valorContratualInicial)}`, 42, timelineStartY + 19);

    // Render aditivos inside milestones
    let currentY = timelineStartY + 35;
    selectedObra.aditivos.forEach((ad, idx) => {
      doc.setFillColor(220, 100, 100);
      doc.circle(35, currentY, 3, "FD");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(ad.dataAssinatura, 42, currentY);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`${ad.numero}º Aditivo Contratual (${ad.tipo.toUpperCase()})`, 42, currentY + 5);
      
      const details = ad.tipo === "financeiro" 
        ? `Acréscimo financeiro: ${formatCurrency(ad.valorAditivado)}`
        : ad.tipo === "prazo"
        ? `Mais ${ad.prazoAditivadoMeses} meses de prazo contratual`
        : `Adversos e financeiros: +${ad.prazoAditivadoMeses} meses e +${formatCurrency(ad.valorAditivado)}`;
      doc.text(details, 42, currentY + 9);
      if (ad.descricao) {
        const dLines = doc.splitTextToSize(ad.descricao, 140);
        doc.text(dLines, 42, currentY + 13);
      }
      
      currentY += 45;
    });
  }


  // PAGE 4: WEEKLY ACTIVITIES & LOGS
  doc.addPage();
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, 20, 190, 9.8, "F"); // moved 1 cm below (from 10 to 20)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("ACOMPANHAMENTO DE ATIVIDADES E PROGRAMAÇÃO", 13, 26.5); // aligned to table left (X = 13, moving down from 18 to 28)

  const atividadesDesenvolvidasText = selectedReport.atividadesSemana && selectedReport.atividadesSemana.length > 0
    ? selectedReport.atividadesSemana.map(item => `• ${item}`).join("\n")
    : "Nenhum registro para o período.";

  const atividadesProximaText = selectedReport.atividadesProximaSemana && selectedReport.atividadesProximaSemana.length > 0
    ? selectedReport.atividadesProximaSemana.map(item => `• ${item}`).join("\n")
    : "Nenhum registro para o período.";

  const observacoesText = selectedReport.observacoesApontamentos && selectedReport.observacoesApontamentos.length > 0
    ? selectedReport.observacoesApontamentos.map(item => `• ${item}`).join("\n")
    : "Sem alertas ou não conformidades registradas.";

  // Build the field information table to preserve the original table look in 2-column mode (campo | informação)
  const infoCampoTableData = [
    [
      { content: "Avanço Físico Executado", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: `${selectedReport.percentualFisico}%` }
    ],
    [
      { content: "Situação do Aditivo", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: selectedReport.situacaoAditivo || "N/A" }
    ],
    [
      { content: "Aumento de Carga (ENEL)", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: selectedReport.statusAumentoCargaEnel || "N/A" }
    ],
    [
      { content: "Subestação Elétrica", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: selectedReport.statusSubestacao || "N/A" }
    ],
    [
      { content: "Infraestrutura de Dados", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: selectedReport.atividadesInfraDados || "N/A" }
    ],
    [
      { content: "Informação Relevante", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: selectedReport.informacaoRelevante || "N/A" }
    ],
    [
      { content: `Atividades Desenvolvidas na Semana (${selectedReport.periodoInicio.split("-").reverse().join("/")} a ${selectedReport.periodoFim.split("-").reverse().join("/")})`, styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: atividadesDesenvolvidasText }
    ],
    [
      { content: "Programação de Atividades para a Próxima Semana", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: atividadesProximaText }
    ],
    [
      { content: "Observações, Não Conformidades & Alertas de Fiscalização", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
      { content: observacoesText }
    ]
  ];

  autoTable(doc, {
    startY: 35, // moved 1 cm below (from 25 to 35)
    body: infoCampoTableData as any,
    theme: "plain",
    tableWidth: 190,
    margin: { left: 10, right: 10 }, // perfect alignment
    styles: {
      fontSize: 8.5,
      textColor: darkTextColor as any,
      lineWidth: 0.1,
      lineColor: borderLight as any,
      cellPadding: { top: 1.27, bottom: 1.27, left: 3, right: 3 }
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 135 }
    }
  });


  // PAGE 5: WEEKLY IMAGE ARCHIVE
  doc.addPage();
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, 20, 190, 9.8, "F"); // moved 1 cm below
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("FOTOS DA SEMANA", 13, 26.5); // aligned to table left

  // Always show 4 slots for photo insertions with removed legend spaces
  let photoX = 15;
  let photoY = 40; // 1 cm below (from 30 to 40)
  
  for (let pIdx = 0; pIdx < 4; pIdx++) {
    const item = selectedReport.fotos && selectedReport.fotos[pIdx];
    
    // Draw border frame first (reduced height 56 to remove legend space)
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(photoX, photoY, 80, 56, "FD");

    let imgLoaded = false;
    if (item && item.url) {
      try {
        const imgData = item.url.startsWith("data:image")
          ? item.url
          : await getBase64ImageFromUrl(item.url);
        if (imgData) {
          doc.addImage(imgData, "JPEG", photoX + 3, photoY + 3, 74, 50, undefined, "FAST");
          imgLoaded = true;
        }
      } catch {
        // ignore fallback
      }
    }

    if (!imgLoaded) {
      // Draw neat camera sketch placeholder centered inside 80x56 frame
      doc.setDrawColor(180, 180, 180);
      doc.rect(photoX + 25, photoY + 12, 30, 20); // camera body
      doc.circle(photoX + 40, photoY + 22, 7); // camera lens
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text("IMAGEM AUXILIAR", photoX + 40, photoY + 41, { align: "center" });
    }

    // Grid increments
    if (pIdx % 2 === 0) {
      photoX = 110;
    } else {
      photoX = 15;
      photoY += 66; // 56 card height + 10 vertical margin
    }
  }

  // DOWNLOAD FINAL PDF
  await _addFooterAndHeaderDecorations(doc);
  doc.save(`CODEMAR_Relatorio_${selectedObra.contratoNo.replace('/', '_')}_Semana_${selectedReport.periodoInicio}.pdf`);
  return doc;
}

// Global page number and border decorator to give maximum polish!
async function _addFooterAndHeaderDecorations(doc: jsPDF) {
  // Empty as requested
}

function _drawCoverPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Slate blueprint style background (professional design)
  doc.setFillColor(30, 41, 59); // deep slate/blue
  doc.rect(x, y, w, h, "F");
  
  // Thin silver grid lines
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.2);
  for (let gridX = x + 10; gridX < x + w; gridX += 10) {
    doc.line(gridX, y, gridX, y + h);
  }
  for (let gridY = y + 10; gridY < y + h; gridY += 10) {
    doc.line(x, gridY, x + w, gridY);
  }
  
  // Outer frame border
  doc.setDrawColor(228, 161, 123);
  doc.setLineWidth(1);
  doc.rect(x + 2, y + 2, w - 4, h - 4, "D");
  
  // Text indicators
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(228, 161, 123);
  doc.text("SUPERVISÃO E FISCALIZAÇÃO CODEMAR", x + w/2, y + h/2 - 2, { align: "center" });
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("[ RECURSO VISUAL PRINCIPAL DO EMPREENDIMENTO ]", x + w/2, y + h/2 + 6, { align: "center" });
}

export async function generateConsolidatedWeeklyPDF(
  reports: { obra: Obra; report: WeeklyReport }[],
  periodoInicio: string,
  periodoFim: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Load the "timbrado" (letterhead background image) prioritizing localStorage, then /timbrado.png, then fallback
  let bgImgData = localStorage.getItem("pdfTimbradoImage");
  if (bgImgData && (bgImgData.startsWith("http") || bgImgData.startsWith("/"))) {
    const fetched = await getBase64ImageFromUrl(bgImgData);
    if (fetched) bgImgData = fetched;
  }
  if (!bgImgData || !bgImgData.startsWith("data:image")) {
    bgImgData = await getBase64ImageFromUrl("/timbrado.png");
  }
  if (!bgImgData || !bgImgData.startsWith("data:image")) {
    bgImgData = await getBase64ImageFromUrl(quantaBackground);
  }

  // Hook into jsPDF's addPage to automatically draw the background on every new page FIRST
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function(...args: any[]) {
    originalAddPage(...args);
    if (bgImgData) {
      doc.addImage(bgImgData, getImageFormat(bgImgData), 0, 0, 210, 297, undefined, "NONE");
    }
    return this;
  }

  // Draw background manually on the very first page
  if (bgImgData) {
    doc.addImage(bgImgData, getImageFormat(bgImgData), 0, 0, 210, 297, undefined, "NONE");
  }

  const primaryColor = [228, 161, 123]; // Quanta soft orange (#E4A17B)
  const darkTextColor = [30, 30, 30];
  const borderLight = [200, 200, 200];

  // Optional CAPA / Cover (with fallback to /cover.jpg)
  let capaImgData = localStorage.getItem("pdfCapaImage");
  if (capaImgData && (capaImgData.startsWith("http") || capaImgData.startsWith("/"))) {
    const fetched = await getBase64ImageFromUrl(capaImgData);
    if (fetched) capaImgData = fetched;
  }
  if (!capaImgData || !capaImgData.startsWith("data:image")) {
    capaImgData = await getBase64ImageFromUrl("/cover.jpg");
  }
  if (capaImgData && capaImgData.startsWith("data:image")) {
    doc.addImage(capaImgData, getImageFormat(capaImgData), 0, 0, 210, 297, undefined, "NONE");
    
    // Draw watermark (timbrado.png) on top of the cover image, but under text
    if (bgImgData) {
      doc.addImage(bgImgData, getImageFormat(bgImgData), 0, 0, 210, 297, undefined, "NONE");
    }
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(30, 30, 30); // blackish
    const titleLines = doc.splitTextToSize("RELATÓRIO SEMANAL\nCONSOLIDADO DE OBRAS", 170);
    const titleY = 165;
    doc.text(titleLines, 20, titleY);

    const titleHeight = titleLines.length * 12;
    const dateY = titleY + titleHeight + 5;

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    const formattedPeriod = `${periodoInicio.split("-").reverse().join(".")} a ${periodoFim.split("-").reverse().join(".")}`;
    doc.text(formattedPeriod, 20, dateY);

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const descParagraph = "Empresa especializada em engenharia para realização de serviços técnicos de Assessoramento, Gerenciamento, Supervisão, Fiscalização Técnica e Controle Tecnológico das obras que serão desenvolvidas no município de Maricá/RJ, no âmbito da CODEMAR.";
    doc.text(descParagraph, 20, dateY + 20, { maxWidth: 170, align: "justify" });

    // Proceed to next page
    doc.addPage();
  }

  // CONTENT PAGE 1: INDEX OF WORKS IN THE CONSOLIDATED REPORT

  // Section title for Index
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text("EMPREENDIMENTOS APRESENTADOS NA SEMANA", 20, 35);

  // Decorative brand or summary
  const summaryParagraph = `Este documento reúne e consolida os diários de atividade, percentuais de avanço físico e relatórios de fiscalização de campo das obras públicas municipais em andamento, sob a gestão da CODEMAR e fiscalização da Quanda Consultoria, referentes à presente semana de referência.`;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(summaryParagraph, 20, 42, { maxWidth: 170, align: "justify" });

  // Horizontal line decoration
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(20, 56, 190, 56);

  // Build Table of included works on page 2
  const indexHeaders = [["Contrato", "Título do Empreendimento", "Avanço", "Status Geral"]];
  const indexRows = reports.map(({ obra, report }) => [
    obra.contratoNo,
    obra.titulo.length > 70 ? obra.titulo.substring(0, 70) + "..." : obra.titulo,
    `${report.percentualFisico}%`,
    obra.statusGeral
  ]);

  autoTable(doc, {
    startY: 62,
    margin: { left: 20, right: 20 },
    head: indexHeaders,
    body: indexRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59] as any, // Elegant dark slate for headers
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold"
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: darkTextColor as any,
      cellPadding: { top: 1.27, bottom: 1.27, left: 3, right: 3 }
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 100 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 }
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [220, 220, 220] as any
    }
  });

  // FOR EACH WORK
  for (const { obra, report } of reports) {
    // Page 2 of currently processed work: DADOS CONTRATUAIS & ADITIVOS
    doc.addPage();

    // Top Header Banner (Moved up by 1 cm -> Y starts at 20)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, 20, 190, 9.8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    
    // Render complete, non-truncated name of work
    const titleLines = doc.splitTextToSize(obra.titulo, 184);
    if (titleLines.length === 1) {
      doc.text(titleLines[0], 13, 26.5);
    } else {
      doc.text(titleLines.slice(0, 2), 13, 24);
    }

    let tableStartY = 35;

    if (report.fotoCapa && report.fotoCapa.startsWith("data:image")) {
      doc.setFillColor(245, 245, 245);
      doc.rect(10, 35, 190, 71.25, "F");
      try {
        const imgProps = doc.getImageProperties(report.fotoCapa);
        const maxW = 190;
        const maxH = 71.25;
        let drawW = maxW;
        let drawH = (imgProps.height * maxW) / imgProps.width;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = (imgProps.width * maxH) / imgProps.height;
        }
        const drawX = 10 + (maxW - drawW) / 2;
        const drawY = 35 + (maxH - drawH) / 2;
        doc.addImage(report.fotoCapa, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");
      } catch (e) {
        console.error("Erro ao desenhar foto de capa:", e);
        doc.addImage(report.fotoCapa, "JPEG", 10, 35, 190, 71.25, undefined, "FAST");
      }
      tableStartY = 109.5;
    } else {
      doc.setFillColor(245, 245, 245);
      doc.rect(10, 35, 190, 71.25, "F");
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Espaço reservado para foto de capa da obra.", 105, 70.6, { align: "center" });
      tableStartY = 109.5;
    }

    const tableData = [
      [
        { content: `Contrato Nº: ${obra.contratoNo}`, colSpan: 2 },
        { content: `Concorrência: ${obra.concorrenciaPublicaNo}`, colSpan: 2 }
      ],
      [
        { content: `Processo Adm: ${obra.processoAdministrativoNo}`, colSpan: 2 },
        { content: `Data de Assinatura: ${obra.dataAssinatura}`, colSpan: 2 }
      ],
      [
        { content: `Publicação JOM: ${obra.dataPublicacaoJOM || "Pendente"}`, colSpan: 2 },
        { content: `Data Ordem Início: ${obra.dataOrdemInicio}`, colSpan: 2 }
      ],
      [
        { content: `Empresa Vencedora: ${obra.empresaVencedora}`, colSpan: 4 }
      ],
      [
        { content: `Prazo Vigência Inicial: ${obra.prazoVigenciaInicial}`, colSpan: 2 },
        { content: `Prazo Execução Inicial: ${obra.prazoExecucaoInicial}`, colSpan: 2 }
      ],
      [
        { content: `Previsão Início: ${obra.dataInicio}`, colSpan: 2 },
        { content: `Valor Contratual Inicial: ${formatCurrency(obra.valorContratualInicial)}`, colSpan: 2 }
      ],
      [
        { content: `Valor Atualizado: ${formatCurrency(obra.valorContratualAtual)}`, colSpan: 4 }
      ]
    ];

    if (obra.aditivos && obra.aditivos.length > 0) {
      obra.aditivos.forEach((ad) => {
        tableData.push([
          { 
            content: `${ad.numero}º TERMO ADITIVO CONTRATUAL`, 
            colSpan: 4, 
            styles: { fontStyle: "bold", fillColor: [240, 240, 240] } 
          } as any
        ]);
        
        const prazoAditivado = ad.prazoAditivadoMeses ? `${ad.prazoAditivadoMeses} meses` : "Nenhum";
        const valorAditivado = ad.valorAditivado ? formatCurrency(ad.valorAditivado) : "Nenhum";
        
        const novoPrazoConsolidado = ad.novoPrazoContratual || "N/A";
        const novoValorConsolidado = ad.novoValorContratual || formatCurrency(obra.valorContratualAtual);
        
        tableData.push([
          { content: `• Data de Assinatura: ${ad.dataAssinatura || "N/A"}`, colSpan: 2 },
          { content: `• Data de publicação no JOM: ${ad.dataPublicacaoJOM || "N/A"}`, colSpan: 2 }
        ]);

        if (ad.tipo === "prazo") {
          // Only prazo: remove "Valor Aditivado" and "Novo Valor Contratual"
          tableData.push([
            { content: `• Prazo Aditivado: ${prazoAditivado}`, colSpan: 4 }
          ]);
          tableData.push([
            { content: `• Novo Prazo de Execução: ${ad.novoPrazoExecucao || novoPrazoConsolidado}`, colSpan: 4 }
          ]);
          tableData.push([
            { content: `• Novo Prazo de Vigência de Contrato: ${novoPrazoConsolidado}`, colSpan: 4 }
          ]);
        } else if (ad.tipo === "financeiro") {
          // Only financial: remove "Novo Prazo de Execução" and "Novo Prazo de Vigência de Contrato"
          tableData.push([
            { content: `• Prazo Aditivado: ${prazoAditivado}`, colSpan: 2 },
            { content: `• Valor Aditivado: ${valorAditivado}`, colSpan: 2 }
          ]);
          tableData.push([
            { content: `• Novo Valor Contratual: ${novoValorConsolidado}`, colSpan: 4 }
          ]);
        } else {
          // Both (ambos) or default: keep all fields
          tableData.push([
            { content: `• Prazo Aditivado: ${prazoAditivado}`, colSpan: 2 },
            { content: `• Valor Aditivado: ${valorAditivado}`, colSpan: 2 }
          ]);
          tableData.push([
            { content: `• Novo Prazo de Execução: ${ad.novoPrazoExecucao || novoPrazoConsolidado}`, colSpan: 2 },
            { content: `• Novo Valor Contratual: ${novoValorConsolidado}`, colSpan: 2 }
          ]);
          tableData.push([
            { content: `• Novo Prazo de Vigência de Contrato: ${novoPrazoConsolidado}`, colSpan: 4 }
          ]);
        }
      });
    }

    autoTable(doc, {
      startY: tableStartY,
      body: tableData as any,
      theme: "plain",
      tableWidth: 190,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 8,
        textColor: darkTextColor as any,
        lineWidth: 0.1,
        lineColor: borderLight as any,
        cellPadding: { top: 1.54, bottom: 1.54, left: 2, right: 2 }
      },
      columnStyles: {
        0: { cellWidth: 47.5 },
        1: { cellWidth: 47.5 },
        2: { cellWidth: 47.5 },
        3: { cellWidth: 47.5 }
      }
    });

    // Page 3 of currently processed work: CRONOLOGIA DE OBRA
    doc.addPage();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // black As requested
    doc.text("CRONOLOGIA DE OBRA", 105, 28, { align: "center" });
    
    if (obra.imagemCronologia) {
      let cronoImg = obra.imagemCronologia;
      if (cronoImg && (cronoImg.startsWith("http") || cronoImg.startsWith("/"))) {
        const fetched = await getBase64ImageFromUrl(cronoImg);
        if (fetched) cronoImg = fetched;
      }
      let imgWidth = 180;
      let imgHeight = 135;
      try {
        const dims = await getImageDimensions(cronoImg);
        if (dims.width > 0 && dims.height > 0) {
          const maxWidth = 180;
          const maxHeight = 240;
          const ratio = dims.width / dims.height;
          
          imgWidth = maxWidth;
          imgHeight = maxWidth / ratio;
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = maxHeight * ratio;
          }
        }
      } catch (e) {
        // Use fallback dimensions
      }

      const xPos = 15 + (180 - imgWidth) / 2; // Center horizontally
      const yPos = 38; // Top-aligned started right below header

      try {
        doc.addImage(cronoImg, getImageFormat(cronoImg), xPos, yPos, imgWidth, imgHeight, undefined, "NONE");
      } catch {
        try {
          const altFormat = getImageFormat(cronoImg) === "PNG" ? "JPEG" : "PNG";
          doc.addImage(cronoImg, altFormat, xPos, yPos, imgWidth, imgHeight, undefined, "NONE");
        } catch (err) {
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text("Não foi possível renderizar a imagem da cronologia. Formato não suportado.", 20, 45);
        }
      }
    } else {
      const timelineStartY = 45;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1.5);
      doc.line(35, timelineStartY, 35, 250); // Vertical central axis

      // Anchor dot 1: Contract signed
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.circle(35, timelineStartY + 10, 3, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(obra.dataAssinatura, 42, timelineStartY + 10);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Assinatura do Contrato de Execução Inicial", 42, timelineStartY + 15);
      doc.text(`Valor Original: ${formatCurrency(obra.valorContratualInicial)}`, 42, timelineStartY + 19);

      // Render aditivos inside milestones
      let currentY = timelineStartY + 35;
      obra.aditivos.forEach((ad, idx) => {
        doc.setFillColor(220, 100, 100);
        doc.circle(35, currentY, 3, "FD");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text(ad.dataAssinatura, 42, currentY);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(`${ad.numero}º Aditivo Contratual (${ad.tipo.toUpperCase()})`, 42, currentY + 5);
        
        const details = ad.tipo === "financeiro" 
          ? `Acréscimo financeiro: ${formatCurrency(ad.valorAditivado)}`
          : ad.tipo === "prazo"
          ? `Mais ${ad.prazoAditivadoMeses} meses de prazo contratual`
          : `Adversos e financeiros: +${ad.prazoAditivadoMeses} meses and +${formatCurrency(ad.valorAditivado)}`;
        doc.text(details, 42, currentY + 9);
        if (ad.descricao) {
          const dLines = doc.splitTextToSize(ad.descricao, 140);
          doc.text(dLines, 42, currentY + 13);
        }
        
        currentY += 45;
      });
    }

    // Page 4 of currently processed work: ACOMPANHAMENTO DE ATIVIDADES & LOGS
    doc.addPage();
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, 20, 190, 9.8, "F"); // moved 1 cm below (from 10 to 20)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("ACOMPANHAMENTO DE ATIVIDADES E PROGRAMAÇÃO", 13, 26.5); // aligned to table left

    const atividadesDesenvolvidasText = report.atividadesSemana && report.atividadesSemana.length > 0
      ? report.atividadesSemana.map(item => `• ${item}`).join("\n")
      : "Nenhum registro para o período.";

    const atividadesProximaText = report.atividadesProximaSemana && report.atividadesProximaSemana.length > 0
      ? report.atividadesProximaSemana.map(item => `• ${item}`).join("\n")
      : "Nenhum registro para o período.";

    const observacoesText = report.observacoesApontamentos && report.observacoesApontamentos.length > 0
      ? report.observacoesApontamentos.map(item => `• ${item}`).join("\n")
      : "Sem alertas ou não conformidades registradas.";

    const infoCampoTableData = [
      [
        { content: "Avanço Físico Executado", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: `${report.percentualFisico}%` }
      ],
      [
        { content: "Situação do Aditivo", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: report.situacaoAditivo || "N/A" }
      ],
      [
        { content: "Aumento de Carga (ENEL)", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: report.statusAumentoCargaEnel || "N/A" }
      ],
      [
        { content: "Subestação Elétrica", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: report.statusSubestacao || "N/A" }
      ],
      [
        { content: "Infraestrutura de Dados", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: report.atividadesInfraDados || "N/A" }
      ],
      [
        { content: "Informação Relevante", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: report.informacaoRelevante || "N/A" }
      ],
      [
        { content: `Atividades Desenvolvidas na Semana (${report.periodoInicio.split("-").reverse().join("/")} a ${report.periodoFim.split("-").reverse().join("/")})`, styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: atividadesDesenvolvidasText }
      ],
      [
        { content: "Programação de Atividades para a Próxima Semana", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: atividadesProximaText }
      ],
      [
        { content: "Observações, Não Conformidades & Alertas de Fiscalização", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } },
        { content: observacoesText }
      ]
    ];

    autoTable(doc, {
      startY: 35, // moved 1 cm below
      body: infoCampoTableData as any,
      theme: "plain",
      tableWidth: 190,
      margin: { left: 10, right: 10 }, // perfect alignment
      styles: {
        fontSize: 8.5,
        textColor: darkTextColor as any,
        lineWidth: 0.1,
        lineColor: borderLight as any,
        cellPadding: { top: 1.27, bottom: 1.27, left: 3, right: 3 }
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 135 }
      }
    });

    // Page 5 of currently processed work: FOTOS DA SEMANA
    doc.addPage();
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, 20, 190, 9.8, "F"); // moved 1 cm below
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("FOTOS DA SEMANA", 13, 26.5); // aligned to table left

    // Always show 4 slots for photo insertions with removed legend spaces
    let photoX = 15;
    let photoY = 40; // 1 cm below (from 30 to 40)
    
    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const item = report.fotos && report.fotos[pIdx];
      
      // Draw border frame first (reduced height 56 to remove legend space)
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.rect(photoX, photoY, 80, 56, "FD");

      let imgLoaded = false;
      if (item && item.url) {
        try {
          const imgData = item.url.startsWith("data:image")
            ? item.url
            : await getBase64ImageFromUrl(item.url);
          if (imgData) {
            doc.addImage(imgData, "JPEG", photoX + 3, photoY + 3, 74, 50, undefined, "FAST");
            imgLoaded = true;
          }
        } catch {
          // ignore fallback
        }
      }

      if (!imgLoaded) {
        // Draw neat camera sketch placeholder centered inside 80x56 frame
        doc.setDrawColor(180, 180, 180);
        doc.rect(photoX + 25, photoY + 12, 30, 20); // camera body
        doc.circle(photoX + 40, photoY + 22, 7); // camera lens
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text("IMAGEM AUXILIAR", photoX + 40, photoY + 41, { align: "center" });
      }

      // Grid increments
      if (pIdx % 2 === 0) {
        photoX = 110;
      } else {
        photoX = 15;
        photoY += 66; // 56 card height + 10 vertical margin
      }
    }
  }

  // DECORATE ALL PAGES
  await _addFooterAndHeaderDecorations(doc);

  // SAVE FILE
  doc.save(`CODEMAR_Relatorio_Consolidado_Semana_${periodoInicio}.pdf`);
  return doc;
}
