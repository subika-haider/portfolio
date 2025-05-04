import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

(async () => {
  const projects = await fetchJSON('../lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  const titleEl = document.querySelector('.projects-title');
  const searchInput = document.querySelector('.searchBar');
  let selectedIndex = -1;

  function updateList(data) {
    renderProjects(data, projectsContainer, 'h2');
    if (titleEl) titleEl.textContent = `${data.length} Projects`;
  }

  function highlightSelection() {
    const svg = d3.select('#projects-pie-plot');
    svg.selectAll('path').attr('class', (_, idx) => idx === selectedIndex ? 'selected' : null);
    const legend = d3.select('.legend');
    legend.selectAll('li').attr('class', (_, idx) => idx === selectedIndex ? 'legend-item selected' : 'legend-item');
  }

  function drawPie(dataSet) {
    const svg = d3.select('#projects-pie-plot');
    svg.selectAll('*').remove();
    const legend = d3.select('.legend');
    legend.selectAll('*').remove();

    const rolled = d3.rollups(
      dataSet,
      v => v.length,
      d => d.year
    );
    const chartData = rolled.map(([year, count]) => ({ value: count, label: year }));

    const colors = d3.scaleOrdinal(d3.schemePaired);
    const arcGen = d3.arc().innerRadius(0).outerRadius(50);
    const pieGen = d3.pie().value(d => d.value);
    const arcs = pieGen(chartData);

    arcs.forEach((d, i) => {
      svg.append('path')
        .attr('d', arcGen(d))
        .attr('fill', colors(i))
        .on('click', () => {
          selectedIndex = selectedIndex === i ? -1 : i;
          const filtered = selectedIndex === -1
            ? dataSet
            : dataSet.filter(p => p.year === chartData[i].label);
          updateList(filtered);
          highlightSelection();
        });
    });

    chartData.forEach((d, i) => {
      legend.append('li')
        .attr('class', 'legend-item')
        .attr('style', `--color:${colors(i)}`)
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
        .on('click', () => {
          selectedIndex = selectedIndex === i ? -1 : i;
          const filtered = selectedIndex === -1
            ? dataSet
            : dataSet.filter(p => p.year === chartData[i].label);
          updateList(filtered);
          highlightSelection();
        });
    });

    highlightSelection();
  }

  updateList(projects);
  drawPie(projects);

  searchInput.addEventListener('input', event => {
    selectedIndex = -1;
    const q = event.target.value.trim().toLowerCase();
    const filtered = projects.filter(project =>
      Object.values(project).join(' ').toLowerCase().includes(q)
    );
    updateList(filtered);
    drawPie(filtered);
  });
})();
