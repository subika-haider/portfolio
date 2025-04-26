import { fetchJSON, renderProjects } from '../global.js';

(async () => {
    const projects = await fetchJSON('../lib/projects.json');
  
    const titleEl = document.querySelector('.projects-title');
    if (titleEl) {
      titleEl.textContent = `${projects.length} Projects`;
    }
  
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer, 'h2');
  })();