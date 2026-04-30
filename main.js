// Mock Data: Skills and Connections
const defaultData = {"name":"RED MORENO","children":[{"name":"ESTADO","children":[{"name":"MUNICIPAL","children":[{"name":"INTENDENCIA","value":1},{"name":"IDUAR","value":1},{"name":"OBRAS PÚBLICAS","value":1},{"name":"DEL. CUARTEL V","value":1},{"name":"HCD","value":1}]},{"name":"PROVINCIAL","children":[{"name":"OPISU","value":1},{"name":"COMIREC","value":1},{"name":"MIN. INFRAESTRUCTURA","value":1}]},{"name":"NACIONAL","children":[{"name":"SISU","value":1}]},{"name":"JUDICIAL","children":[{"name":"FISCALÍAS","value":1},{"name":"JUZGADOS / DEF.","value":1}]},{"name":"EDUCACIÓN","children":[{"name":"UNM","value":1},{"name":"FADU","value":1}]},{"name":"SEGURIDAD","children":[{"name":"POLICÍA","value":1}]}]},{"name":"MARCO LEGAL","children":[{"name":"NORMAS","children":[{"name":"LEY 8912","value":1},{"name":"LEY HÁBITAT","value":1},{"name":"CÓDIGO URBANO","value":1}]}]},{"name":"ORGANIZACIONES","children":[{"name":"SOCIAL / ONG","children":[{"name":"MADRE TIERRA","value":1},{"name":"TECHO","value":1},{"name":"MOV. SOCIALES","value":1},{"name":"COOPERATIVAS","value":1}]},{"name":"VECINAL","children":[{"name":"SOC. FOMENTO","value":1},{"name":"OCUPANTES","value":1}]}]},{"name":"MERCADO","children":[{"name":"INFORMAL","children":[{"name":"LOTEADORES INF.","value":1},{"name":"PUNTEROS","value":1}]},{"name":"FORMAL","children":[{"name":"INMOBILIARIAS","value":1},{"name":"PROFESIONALES","value":1},{"name":"SERVICIOS","value":1},{"name":"CORRALONES","value":1}]}]}]};

const data = JSON.parse(localStorage.getItem('red_moreno_data')) || defaultData;

// 1. Configurar el lienzo
const width = 1000; // Aumentado para acomodar 3 anillos
const radius = width / 2;
const svg = d3.select("#viz")
    .attr("viewBox", [-radius, -radius, width, width]);

// Definir filtros de brillo (Glow)
const defs = svg.append("defs");

const filter = defs.append("filter")
    .attr("id", "glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

filter.append("feGaussianBlur")
    .attr("stdDeviation", "3.5")
    .attr("result", "blur");

filter.append("feComposite")
    .attr("in", "SourceGraphic")
    .attr("in2", "blur")
    .attr("operator", "over");

// 2. Crear la jerarquía
const hierarchy = d3.hierarchy(data)
    .sum(d => d.value || 1);

const partition = d3.partition()
    .size([2 * Math.PI, radius - 140]);

partition(hierarchy);

// Paleta de colores basada en la imagen proporcionada (Oscuro a claro)
const colorMap = {
  "ESTADO": ["#2C559A", "#637EAD", "#8E9FBE"],
  "MARCO LEGAL": ["#80977B", "#96AC9F", "#B1C6BB"], // Usando verde para Marco Legal
  "ORGANIZACIONES": ["#E55C30", "#EE8B68", "#F4B399"],
  "MERCADO": ["#DDAE54", "#E2C076", "#EAD0A0"],
  "DEFAULT": ["#F8B0B3", "#F9C7C8", "#FCDCDD"] 
};

function getNodeColor(d) {
  if (d.depth === 0) return "#ffffff";
  let categoryNode = d;
  while (categoryNode.depth > 1) {
    categoryNode = categoryNode.parent;
  }
  const palette = colorMap[categoryNode.data.name] || colorMap["DEFAULT"];
  return palette[Math.min(d.depth - 1, 2)];
}

// 3. Dibujar los arcos (Flipping radius: depth 1 outside, depth 3 inside)
const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius / 2)
    .innerRadius(d => {
        if (d.depth === 1) return radius - 50;
        if (d.depth === 2) return radius - 110;
        return radius - 215;
    })
    .outerRadius(d => {
        if (d.depth === 1) return radius;
        if (d.depth === 2) return radius - 55;
        return radius - 115;
    });

const paths = svg.append("g")
  .selectAll("path")
  .data(hierarchy.descendants().filter(d => d.depth > 0))
  .join("path")
  .attr("id", (d, i) => `arc-${i}`) // ID único para textPath
  .attr("d", arc)
  .attr("fill", d => getNodeColor(d))
  .attr("fill-opacity", 0.9)
  .attr("class", "node")
  .style("transition", "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)");

// Etiquetas
const labels = svg.append("g")
    .attr("pointer-events", "none");

// Limpiar defs previos si los hay (para evitar IDs duplicados si se re-ejecuta)
defs.selectAll(".temp-text-path").remove();

// 1. Etiquetas curvas para los primeros dos anillos
labels.selectAll(".curved-text")
    .data(hierarchy.descendants().filter(d => d.depth > 0 && d.depth < 3 && (d.x1 - d.x0) > 0.05))
    .join("text")
    .attr("class", "curved-text")
    .append("textPath")
    .attr("xlink:href", (d, i) => {
        const r = d.depth === 1 ? radius - 25 : radius - 82;
        const midAngle = (d.x0 + d.x1) / 2;
        const invert = midAngle > Math.PI / 2 && midAngle < 3 * Math.PI / 2;
        
        let pathData;
        if (invert) {
            // Generar arco de derecha a izquierda (CCW) para que el texto quede derecho abajo
            // D3 arc angles: 0 is North. 
            // x = r * sin, y = -r * cos
            const x0 = r * Math.sin(d.x1);
            const y0 = -r * Math.cos(d.x1);
            const x1 = r * Math.sin(d.x0);
            const y1 = -r * Math.cos(d.x0);
            // M startx starty A rx ry x-axis-rotation large-arc-flag sweep-flag endx endy
            // sweep-flag 0 = CCW
            pathData = `M ${x0} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1}`;
        } else {
            // Generar arco de izquierda a derecha (CW) para la parte superior
            const x0 = r * Math.sin(d.x0);
            const y0 = -r * Math.cos(d.x0);
            const x1 = r * Math.sin(d.x1);
            const y1 = -r * Math.cos(d.x1);
            // sweep-flag 1 = CW
            pathData = `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
        }
        
        // Usar el índice i para asegurar unicidad absoluta del ID
        const pathId = `text-path-${d.depth}-${i}`;
        defs.append("path")
            .attr("id", pathId)
            .attr("class", "temp-text-path")
            .attr("d", pathData);
        return `#${pathId}`;
    })
    .attr("startOffset", "50%")
    .attr("text-anchor", "middle")
    .attr("fill", d => d.depth === 1 ? "white" : "black")
    .attr("dy", "0.35em")
    .style("font-size", "16px")
    .style("font-weight", "800")
    .style("text-transform", "uppercase")
    .style("letter-spacing", "1px")
    .text(d => d.data.name);





// 2. Etiquetas radiales para el tercer anillo (Actores)
labels.selectAll(".radial-text")
    .data(hierarchy.descendants().filter(d => d.depth === 3 && (d.x1 - d.x0) > 0.015))
    .join("text")
    .attr("class", "radial-text")
    .attr("transform", function(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
        const y = radius - 165;
        return `rotate(${x}) translate(${y},0) rotate(${x > 90 ? 180 : 0})`;
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .style("font-size", "10px")
    .style("font-weight", "600")
    .text(d => d.data.name.toUpperCase());


// 4. Dibujar los vínculos (Líneas internas - conectando actores en el centro)
const leafNodes = hierarchy.leaves();

const getNode = name => leafNodes.find(n => n.data.name === name);

const defaultLinkDefinitions = [{"s":"INTENDENCIA","t":"IDUAR","type":1},{"s":"INTENDENCIA","t":"OBRAS PÚBLICAS","type":1},{"s":"OPISU","t":"INTENDENCIA","type":5},{"s":"COMIREC","t":"OBRAS PÚBLICAS","type":5},{"s":"SISU","t":"MOV. SOCIALES","type":5},{"s":"IDUAR","t":"OBRAS PÚBLICAS","type":3},{"s":"OBRAS PÚBLICAS","t":"DEL. CUARTEL V","type":1},{"s":"DEL. CUARTEL V","t":"OBRAS PÚBLICAS","type":6},{"s":"HCD","t":"IDUAR","type":4},{"s":"OCUPANTES","t":"DEL. CUARTEL V","type":6},{"s":"LOTEADORES INF.","t":"OCUPANTES","type":4},{"s":"LOTEADORES INF.","t":"IDUAR","type":3},{"s":"PUNTEROS","t":"DEL. CUARTEL V","type":4},{"s":"POLICÍA","t":"OCUPANTES","type":3},{"s":"POLICÍA","t":"LOTEADORES INF.","type":3},{"s":"LEY HÁBITAT","t":"IDUAR","type":7},{"s":"LEY 8912","t":"PROFESIONALES","type":7},{"s":"MADRE TIERRA","t":"IDUAR","type":2},{"s":"TECHO","t":"DEL. CUARTEL V","type":4},{"s":"UNM","t":"IDUAR","type":4},{"s":"UNM","t":"DEL. CUARTEL V","type":4},{"s":"UNM","t":"COOPERATIVAS","type":4},{"s":"UNM","t":"OCUPANTES","type":4},{"s":"FADU","t":"IDUAR","type":4},{"s":"FADU","t":"DEL. CUARTEL V","type":4},{"s":"FADU","t":"COOPERATIVAS","type":4},{"s":"FADU","t":"OCUPANTES","type":4},{"s":"CORRALONES","t":"OCUPANTES","type":2},{"s":"SERVICIOS","t":"OCUPANTES","type":3},{"s":"PROFESIONALES","t":"IDUAR","type":4},{"s":"DEL. CUARTEL V","t":"INTENDENCIA","type":6},{"s":"IDUAR","t":"HCD","type":6},{"s":"TECHO","t":"OCUPANTES","type":2},{"s":"INTENDENCIA","t":"POLICÍA","type":1},{"s":"MOV. SOCIALES","t":"OCUPANTES","type":2},{"s":"OBRAS PÚBLICAS","t":"LEY 8912","type":7},{"s":"HCD","t":"CÓDIGO URBANO","type":7}];

const linkDefinitions = JSON.parse(localStorage.getItem('red_moreno_links')) || defaultLinkDefinitions;


const links = linkDefinitions.map(l => ({
    source: getNode(l.s),
    target: getNode(l.t),
    type: l.type
})).filter(l => l.source && l.target);

const relationColors = {
  1: "#9E9E9E", // Dependencia jerárquica (Gris)
  2: "#6B8E23", // Relación positiva (Verde oliva)
  3: "#FF7675", // Relación negativa (Rojo claro)
  4: "#F39C12", // Relación técnica/funcional (Amarillo naranja)
  5: "#27AE60", // Financiación (Verde)
  6: "#C0392B", // Presión / Reclamo (Rojo)
  7: "#8E44AD"  // Regulación / Control (Violeta)
};

const line = d3.lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius(d => d.r)
    .angle(d => d.a);

const linksLayer = svg.append("g").attr("fill", "none").attr("class", "links-layer");
let linkPaths;

function renderLinks() {
    const linksData = linkDefinitions.map(l => ({
        source: getNode(l.s),
        target: getNode(l.t),
        type: l.type
    })).filter(l => l.source && l.target);

    linkPaths = linksLayer.selectAll("path")
        .data(linksData)
        .join("path")
        .attr("class", "link")
        .attr("d", d => {
            const sA = (d.source.x0 + d.source.x1) / 2;
            const tA = (d.target.x0 + d.target.x1) / 2;
            const rB = radius - 215;
            
            let diff = Math.abs(sA - tA);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            
            // Ajuste fino para la curvatura: usa raíz cuadrada para que la curva sea más pronunciada pero fluida
            // Para diff pequeño, midR será aprox 0.6-0.7 * rB (similar al dibujo verde)
            const midR = rB * (1 - Math.sqrt(Math.min(1, diff / 1.5))); 
            
            let aMid = (sA + tA) / 2;
            if (Math.abs(sA - tA) > Math.PI) aMid += Math.PI;

            return line([
                {r: rB, a: sA},
                {r: midR, a: aMid},
                {r: rB, a: tA}
            ]);
        })
        .attr("stroke", d => relationColors[d.type] || "#8e8e93")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 2);

    return linkPaths;
}

renderLinks();

// Animación de flujo inicial en los links
linkPaths.each(function(d) {
    const length = this.getTotalLength();
    d3.select(this)
        .attr("stroke-dasharray", `${length} ${length}`)
        .attr("stroke-dashoffset", length)
        .transition()
        .duration(2000)
        .delay((d, i) => i * 100)
        .ease(d3.easeExpOut)
        .attr("stroke-dashoffset", 0);
});

// Interacciones
paths.on("mouseenter", function(event, d) {
    const connectedNodes = new Set();
    connectedNodes.add(d);

    d3.select(this)
        .attr("fill-opacity", 1)
        .style("filter", "url(#glow)");
    
    // Obtener los links actualizados
    linksLayer.selectAll("path").transition().duration(300)
             .style("stroke-opacity", l => {
                 if (l.source === d || l.target === d) {
                     connectedNodes.add(l.source);
                     connectedNodes.add(l.target);
                     return 1;
                 }
                 return 0.05;
             })
             .style("stroke-width", l => (l.source === d || l.target === d) ? 3 : 1.5)
             .attr("stroke", l => relationColors[l.type] || "#8e8e93")
             .style("filter", l => (l.source === d || l.target === d) ? "url(#glow)" : "none");

    // Resaltar etiquetas
    svg.selectAll("text").transition().duration(300)
       .style("opacity", t => connectedNodes.has(t) ? 1 : 0.1)
       .style("font-size", t => {
           if (connectedNodes.has(t)) return t.depth === 3 ? "14px" : "18px";
           return t.depth === 3 ? "10px" : "16px";
       });
})
.on("mouseleave", function() {
    paths.attr("fill-opacity", 0.9)
         .style("filter", "none");
    
    linksLayer.selectAll("path").transition().duration(300)
             .style("stroke-opacity", 0.4)
             .style("stroke-width", 2)
             .attr("stroke", l => relationColors[l.type] || "#8e8e93")
             .style("filter", "none");

    svg.selectAll("text").transition().duration(300)
       .style("opacity", 0.8)
       .style("font-size", d => d.depth === 3 ? "10px" : "16px");
});

// Lógica de UI Interactiva
document.addEventListener('DOMContentLoaded', () => {
    const dataList = document.getElementById("actor-list");
    const parentSelect = document.getElementById("new-actor-parent");
    
    // Poblar datalist con actores
    const actorNames = leafNodes.map(d => d.data.name).sort();
    actorNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        dataList.appendChild(option);
    });

    // Poblar parentSelect con subcategorías (profundidad 2)
    const subcategories = hierarchy.descendants().filter(d => d.depth === 2).map(d => d.data.name).sort();
    subcategories.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.text = name;
        parentSelect.appendChild(option);
    });

    // Poblar subParentSelect con categorías (profundidad 1)
    const subParentSelect = document.getElementById("new-sub-parent");
    const categories = data.children.map(c => c.name).sort();
    categories.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.text = name;
        subParentSelect.appendChild(option);
    });

    document.getElementById("add-connection").addEventListener("click", () => {
        const s = document.getElementById("source-actor").value;
        const t = document.getElementById("target-actor").value;
        const type = document.getElementById("relation-type").value;
        
        if (s && t && type && s !== t && actorNames.includes(s) && actorNames.includes(t)) {
            linkDefinitions.push({ s, t, type: parseInt(type) });
            localStorage.setItem('red_moreno_links', JSON.stringify(linkDefinitions));
            renderLinks();
            
            const newPaths = linksLayer.selectAll("path").filter((d, i, nodes) => i === nodes.length - 1);
            newPaths.each(function() {
                const length = this.getTotalLength();
                d3.select(this)
                    .attr("stroke-dasharray", `${length} ${length}`)
                    .attr("stroke-dashoffset", length)
                    .transition()
                    .duration(1500)
                    .ease(d3.easeExpOut)
                    .attr("stroke-dashoffset", 0);
            });
            
            document.getElementById("source-actor").value = "";
            document.getElementById("target-actor").value = "";
            document.getElementById("relation-type").value = "";
        } else {
            alert("Por favor, ingresa actores válidos y un tipo de relación.");
        }
    });

    // Eliminar Relación
    document.getElementById("delete-relation").addEventListener("click", () => {
        const s = document.getElementById("del-rel-source").value.trim().toUpperCase();
        const t = document.getElementById("del-rel-target").value.trim().toUpperCase();

        if (s && t) {
            const initialLength = linkDefinitions.length;
            linkDefinitions = linkDefinitions.filter(link => !(link.s === s && link.t === t));
            
            if (linkDefinitions.length < initialLength) {
                localStorage.setItem('red_moreno_links', JSON.stringify(linkDefinitions));
                renderLinks();
                document.getElementById("del-rel-source").value = "";
                document.getElementById("del-rel-target").value = "";
            } else {
                alert("No se encontró una relación desde " + s + " hacia " + t);
            }
        } else {
            alert("Ingresa ambos actores para buscar la relación.");
        }
    });

    // Añadir Actor
    document.getElementById("add-actor").addEventListener("click", () => {
        const newName = document.getElementById("new-actor-name").value.trim().toUpperCase();
        const parentName = parentSelect.value;

        if (newName && parentName) {
            if (actorNames.includes(newName)) {
                alert("Ese actor ya existe.");
                return;
            }
            
            // Buscar subcategoría en 'data' recursivamente
            function addNodeToParent(node) {
                if (node.name === parentName && node.children) {
                    node.children.push({ name: newName, value: 1 });
                    return true;
                }
                if (node.children) {
                    for (let child of node.children) {
                        if (addNodeToParent(child)) return true;
                    }
                }
                return false;
            }
            
            addNodeToParent(data);
            localStorage.setItem('red_moreno_data', JSON.stringify(data));
            location.reload(); // Recargar para reconstruir jerarquía D3
        } else {
            alert("Completa el nombre y selecciona la subcategoría padre.");
        }
    });

    // Eliminar Actor
    document.getElementById("delete-actor").addEventListener("click", () => {
        const delName = document.getElementById("delete-actor-name").value.trim().toUpperCase();
        if (delName && actorNames.includes(delName)) {
            // Eliminar de 'data'
            function removeNode(node) {
                if (node.children) {
                    const idx = node.children.findIndex(c => c.name === delName);
                    if (idx !== -1) {
                        node.children.splice(idx, 1);
                        return true;
                    }
                    for (let child of node.children) {
                        if (removeNode(child)) return true;
                    }
                }
                return false;
            }

            removeNode(data);
            
            // Eliminar links relacionados
            const filteredLinks = linkDefinitions.filter(l => l.s !== delName && l.t !== delName);
            
            localStorage.setItem('red_moreno_data', JSON.stringify(data));
            localStorage.setItem('red_moreno_links', JSON.stringify(filteredLinks));
            location.reload();
        } else {
            alert("Ingresa un actor válido para eliminar.");
        }
    });

    // Renombrar Actor
    document.getElementById("rename-actor").addEventListener("click", () => {
        const oldName = document.getElementById("rename-actor-old").value.trim().toUpperCase();
        const newName = document.getElementById("rename-actor-new").value.trim().toUpperCase();

        if (oldName && newName && actorNames.includes(oldName)) {
            if (actorNames.includes(newName)) {
                alert("El nuevo nombre ya existe.");
                return;
            }

            // Actualizar en 'data'
            function renameNode(node) {
                if (node.name === oldName) {
                    node.name = newName;
                    return true;
                }
                if (node.children) {
                    for (let child of node.children) {
                        if (renameNode(child)) return true;
                    }
                }
                return false;
            }

            renameNode(data);

            // Actualizar en 'linkDefinitions'
            linkDefinitions.forEach(link => {
                if (link.s === oldName) link.s = newName;
                if (link.t === oldName) link.t = newName;
            });

            localStorage.setItem('red_moreno_data', JSON.stringify(data));
            localStorage.setItem('red_moreno_links', JSON.stringify(linkDefinitions));
            location.reload();
        } else {
            alert("Completa ambos campos con nombres válidos.");
        }
    });

    // Añadir Subcategoría
    document.getElementById("add-subcategory").addEventListener("click", () => {
        const subName = document.getElementById("new-sub-name").value.trim().toUpperCase();
        const parentCatName = subParentSelect.value;

        if (subName && parentCatName) {
            const cat = data.children.find(c => c.name === parentCatName);
            if (cat) {
                if (cat.children.some(s => s.name === subName)) {
                    alert("Esa subcategoría ya existe en esta categoría.");
                    return;
                }
                cat.children.push({ name: subName, children: [] });
                localStorage.setItem('red_moreno_data', JSON.stringify(data));
                location.reload();
            }
        } else {
            alert("Completa el nombre y selecciona la categoría padre.");
        }
    });

    // Exportar a JPG
    document.getElementById("export-jpg").addEventListener("click", () => {
        // Ocultar temporalmente animaciones o hover effects si los hubiera
        html2canvas(document.querySelector("#viz"), { backgroundColor: null }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Red-Moreno.jpg';
            // Usar un fondo blanco explícito si se quiere, html2canvas capture null background as transparent. 
            // Para JPG necesitamos forzar fondo blanco.
            const ctx = canvas.getContext('2d');
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            link.href = canvas.toDataURL("image/jpeg", 1.0);
            link.click();
        });
    });

    // Exportar a PDF
    document.getElementById("export-pdf").addEventListener("click", () => {
        html2canvas(document.querySelector("#viz"), { backgroundColor: null }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), 'JPEG', 0, 0, canvas.width, canvas.height);
            pdf.save("Red-Moreno.pdf");
        });
    });
});

