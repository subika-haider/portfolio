import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

(async () => {
  const projects = await fetchJSON('../lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  const titleEl = document.querySelector('.projects-title');
  const searchInput = document.querySelector('.searchBar');
  let selectedIndex = -1;

  function renderPieChart(projectsGiven) {
    const svg = d3.select('#projects-pie-plot');
    svg.selectAll('path').remove();
    const legend = d3.select('.legend');
    legend.selectAll('li').remove();

    let rolledData = d3.rollups(
      projectsGiven,
      v => v.length,
      d => d.year
    );
    let data = rolledData.map(([year, count]) => ({ value: count, label: year }));
    let colors = d3.scaleOrdinal(d3.schemePaired);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let sliceGenerator = d3.pie().value(d => d.value);
    let arcData = sliceGenerator(data);

    arcData.forEach((d, idx) => {
      svg.append('path')
        .attr('d', arcGenerator(d))
        .attr('fill', colors(idx))
        .attr('class', idx === selectedIndex ? 'selected' : null)
        .on('click', () => {
          selectedIndex = selectedIndex === idx ? -1 : idx;
          let displayData = selectedIndex === -1
            ? projectsGiven
            : projectsGiven.filter(p => p.year === data[idx].label);
          renderProjects(displayData, projectsContainer, 'h2');
          if (titleEl) titleEl.textContent = `${displayData.length} Projects`;
          renderPieChart(displayData);
        });
    });

    data.forEach((d, idx) => {
      legend.append('li')
        .attr('class', `legend-item${idx === selectedIndex ? ' selected' : ''}`)
        .attr('style', `--color:${colors(idx)}`)
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
        .on('click', () => {
          selectedIndex = selectedIndex === idx ? -1 : idx;
          let displayData = selectedIndex === -1
            ? projectsGiven
            : projectsGiven.filter(p => p.year === data[idx].label);
          renderProjects(displayData, projectsContainer, 'h2');
          if (titleEl) titleEl.textContent = `${displayData.length} Projects`;
          renderPieChart(displayData);
        });
    });
  }

  renderProjects(projects, projectsContainer, 'h2');
  if (titleEl) titleEl.textContent = `${projects.length} Projects`;
  renderPieChart(projects);

  searchInput.addEventListener('input', (event) => {
    selectedIndex = -1;
    let query = event.target.value.trim().toLowerCase();
    let filteredProjects = projects.filter(project =>
      Object.values(project).join(' ').toLowerCase().includes(query)
    );
    renderProjects(filteredProjects, projectsContainer, 'h2');
    if (titleEl) titleEl.textContent = `${filteredProjects.length} Projects`;
    renderPieChart(filteredProjects);
  });
}





)();
